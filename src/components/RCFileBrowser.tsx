'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Folder, 
  File, 
  ArrowLeft, 
  ArrowRight, 
  Home, 
  Upload,
  Download,
  Copy,
  Move,
  Trash2,
  RefreshCw,
  FolderPlus,
  FilePlus,
  Search,
  Grid3X3,
  List,
  ChevronRight,
  Clock,
  HardDrive
} from 'lucide-react';

interface RCFileItem {
  name: string;
  path: string;
  size: number;
  modTime: string;
  isDir: boolean;
  mimeType?: string;
}

interface RCFileBrowserProps {
  title: string;
  initialRemote?: string;
  initialPath?: string;
  onFileSelect?: (files: RCFileItem[]) => void;
  selectedFiles?: RCFileItem[];
  onSelectionChange?: (files: RCFileItem[]) => void;
  multiSelect?: boolean;
  showHidden?: boolean;
}

export default function RCFileBrowser({
  title,
  initialRemote = '',
  initialPath = '',
  onFileSelect,
  selectedFiles = [],
  onSelectionChange,
  multiSelect = false,
  showHidden = false
}: RCFileBrowserProps) {
  const [currentRemote, setCurrentRemote] = useState(initialRemote);
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [files, setFiles] = useState<RCFileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [remotes, setRemotes] = useState<string[]>([]);

  // Fetch available remotes
  const fetchRemotes = async () => {
    try {
      const response = await fetch('/api/rclone/rc?action=endpoint&endpoint=config/dump');
      if (response.ok) {
        const data = await response.json();
        if (data.sections) {
          const remoteList = Object.keys(data.sections);
          setRemotes(remoteList);
        }
      }
    } catch (error) {
      console.error('Failed to fetch remotes:', error);
    }
  };

  // Fetch files for current path
  const fetchFiles = async () => {
    if (!currentRemote) return;

    setLoading(true);
    setError(null);

    try {
      const fs = `${currentRemote}:${currentPath}`;
      const response = await fetch('/api/rclone/rc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'operations',
          endpoint: 'list',
          data: {
            fs,
            remote: '',
            opt: {
              recurse: false,
              noModTime: false,
              showEncrypted: false,
              showOrigIDs: false,
              showHash: false
            }
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.list) {
          const fileList = data.list.map((item: any) => ({
            name: item.Name,
            path: item.Path,
            size: item.Size,
            modTime: item.ModTime,
            isDir: item.IsDir,
            mimeType: item.MimeType
          }));

          // Filter hidden files if not showing them
          const filteredFiles = showHidden 
            ? fileList 
            : fileList.filter((file: RCFileItem) => !file.name.startsWith('.'));

          // Sort: directories first, then files, both alphabetically
          const sortedFiles = filteredFiles.sort((a: RCFileItem, b: RCFileItem) => {
            if (a.isDir && !b.isDir) return -1;
            if (!a.isDir && b.isDir) return 1;
            return a.name.localeCompare(b.name);
          });

          setFiles(sortedFiles);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch files');
      }
    } catch (error) {
      setError('Failed to fetch files');
      console.error('Error fetching files:', error);
    } finally {
      setLoading(false);
    }
  };

  // Navigate to directory
  const navigateTo = (path: string) => {
    setCurrentPath(path);
  };

  // Navigate up one directory
  const navigateUp = () => {
    const parts = currentPath.split('/').filter(part => part);
    parts.pop();
    const newPath = parts.join('/');
    setCurrentPath(newPath);
  };

  // Navigate to parent directory
  const navigateToParent = () => {
    if (files.length > 0) {
      const parentFile = files.find(file => file.name === '..');
      if (parentFile) {
        navigateTo(parentFile.path);
      }
    }
  };

  // Handle file selection
  const handleFileSelect = (file: RCFileItem) => {
    if (file.isDir) {
      navigateTo(file.path);
      return;
    }

    let newSelection: RCFileItem[];
    
    if (multiSelect) {
      const isSelected = selectedFiles.some(f => f.path === file.path);
      if (isSelected) {
        newSelection = selectedFiles.filter(f => f.path !== file.path);
      } else {
        newSelection = [...selectedFiles, file];
      }
    } else {
      newSelection = [file];
    }

    onSelectionChange?.(newSelection);
    onFileSelect?.(newSelection);
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString() + ' ' + 
             new Date(dateString).toLocaleTimeString();
    } catch {
      return dateString;
    }
  };

  // Get file icon
  const getFileIcon = (file: RCFileItem) => {
    if (file.isDir) {
      return <Folder className="h-4 w-4 text-blue-500" />;
    }
    
    const extension = file.name.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return <File className="h-4 w-4 text-red-500" />;
      case 'doc':
      case 'docx':
        return <File className="h-4 w-4 text-blue-600" />;
      case 'xls':
      case 'xlsx':
        return <File className="h-4 w-4 text-green-600" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <File className="h-4 w-4 text-purple-500" />;
      case 'mp4':
      case 'avi':
      case 'mkv':
        return <File className="h-4 w-4 text-orange-500" />;
      case 'zip':
      case 'rar':
      case '7z':
        return <File className="h-4 w-4 text-yellow-600" />;
      default:
        return <File className="h-4 w-4 text-gray-500" />;
    }
  };

  // Filter files based on search query
  const filteredFiles = files.filter(file => 
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Initialize
  useEffect(() => {
    fetchRemotes();
  }, []);

  useEffect(() => {
    if (currentRemote) {
      fetchFiles();
    }
  }, [currentRemote, currentPath]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Folder className="h-5 w-5" />
              {title}
            </CardTitle>
            <CardDescription>
              {currentRemote ? `${currentRemote}:${currentPath || '/'}` : '选择远程存储'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            >
              {viewMode === 'list' ? <Grid3X3 className="h-4 w-4" /> : <List className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchFiles}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Remote Selection */}
        <div className="flex items-center gap-2">
          <select
            value={currentRemote}
            onChange={(e) => {
              setCurrentRemote(e.target.value);
              setCurrentPath('');
            }}
            className="flex-1 px-3 py-2 border rounded-md bg-background"
          >
            <option value="">选择远程存储...</option>
            {remotes.map(remote => (
              <option key={remote} value={remote}>{remote}</option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPath('')}
            disabled={!currentRemote}
          >
            <Home className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={navigateUp}
            disabled={!currentPath || !currentRemote}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索文件..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* File List */}
        <ScrollArea className="h-96 border rounded-md">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !currentRemote ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              请选择一个远程存储
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              {searchQuery ? '没有找到匹配的文件' : '此目录为空'}
            </div>
          ) : viewMode === 'list' ? (
            <div className="divide-y">
              {filteredFiles.map((file) => (
                <div
                  key={file.path}
                  className={`flex items-center justify-between p-3 hover:bg-accent cursor-pointer transition-colors ${
                    selectedFiles.some(f => f.path === file.path) ? 'bg-accent' : ''
                  }`}
                  onClick={() => handleFileSelect(file)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {getFileIcon(file)}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{file.name}</div>
                      {file.isDir && (
                        <div className="text-xs text-muted-foreground">文件夹</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {!file.isDir && (
                      <div className="flex items-center gap-1">
                        <HardDrive className="h-3 w-3" />
                        {formatFileSize(file.size)}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(file.modTime)}
                    </div>
                    {multiSelect && (
                      <input
                        type="checkbox"
                        checked={selectedFiles.some(f => f.path === file.path)}
                        onChange={() => {}}
                        className="rounded"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-3">
              {filteredFiles.map((file) => (
                <div
                  key={file.path}
                  className={`flex flex-col items-center p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors ${
                    selectedFiles.some(f => f.path === file.path) ? 'bg-accent' : ''
                  }`}
                  onClick={() => handleFileSelect(file)}
                >
                  <div className="mb-2">
                    {getFileIcon(file)}
                  </div>
                  <div className="text-sm font-medium text-center truncate w-full">
                    {file.name}
                  </div>
                  {!file.isDir && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatFileSize(file.size)}
                    </div>
                  )}
                  {multiSelect && (
                    <input
                      type="checkbox"
                      checked={selectedFiles.some(f => f.path === file.path)}
                      onChange={() => {}}
                      className="rounded mt-2"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Selected Files Info */}
        {selectedFiles.length > 0 && (
          <div className="p-3 bg-muted rounded-md">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                已选择 {selectedFiles.length} 个文件
                {!multiSelect && selectedFiles.length === 1 && (
                  <span className="ml-2 text-muted-foreground">
                    {selectedFiles[0].name}
                  </span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSelectionChange?.([])}
              >
                清除选择
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}