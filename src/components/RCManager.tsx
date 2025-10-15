'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Play, 
  Square, 
  RotateCcw, 
  Activity, 
  Clock, 
  HardDrive, 
  Zap,
  Settings,
  List,
  BarChart3,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

interface RCStatus {
  running: boolean;
  url: string;
  message: string;
}

interface Job {
  id: number;
  status?: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  error?: string;
  finished?: boolean;
  success?: boolean;
  output?: any;
}

interface Stats {
  bytes: number;
  checks: number;
  deletes: number;
  elapsedTime: number;
  errors: number;
  eta: number;
  fatalError: boolean;
  lastError: string;
  renames: number;
  listed: number;
  speed: number;
  totalBytes: number;
  totalTransfers: number;
  transfers: number;
  transferring: any[];
  checking: any[];
}

interface BWLimit {
  bytesPerSecond: number;
  bytesPerSecondTx: number;
  bytesPerSecondRx: number;
  rate: string;
}

export default function RCManager() {
  const [rcStatus, setRcStatus] = useState<RCStatus | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [bwlimit, setBwlimit] = useState<BWLimit | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [bwRate, setBwRate] = useState('');

  // Fetch RC server status
  const fetchRCStatus = async () => {
    try {
      const response = await fetch('/api/rclone/rc?action=status');
      const data = await response.json();
      setRcStatus(data);
    } catch (error) {
      console.error('Failed to fetch RC status:', error);
    }
  };

  // Fetch jobs
  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/rclone/rc?action=jobs');
      const data = await response.json();
      if (data.jobids) {
        const jobDetails = await Promise.all(
          data.jobids.map(async (jobId: number) => {
            const jobResponse = await fetch(`/api/rclone/rc?action=jobstatus&jobid=${jobId}`);
            return await jobResponse.json();
          })
        );
        setJobs(jobDetails);
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/rclone/rc?action=stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  // Fetch bandwidth limit
  const fetchBWLimit = async () => {
    try {
      const response = await fetch('/api/rclone/rc?action=bwlimit');
      const data = await response.json();
      setBwlimit(data);
    } catch (error) {
      console.error('Failed to fetch bandwidth limit:', error);
    }
  };

  // Start RC server
  const startRCServer = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/rclone/rc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' })
      });
      const data = await response.json();
      if (data.success) {
        await fetchRCStatus();
      }
    } catch (error) {
      console.error('Failed to start RC server:', error);
    } finally {
      setLoading(false);
    }
  };

  // Stop RC server
  const stopRCServer = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/rclone/rc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' })
      });
      const data = await response.json();
      if (data.success) {
        await fetchRCStatus();
        setJobs([]);
        setStats(null);
        setBwlimit(null);
      }
    } catch (error) {
      console.error('Failed to stop RC server:', error);
    } finally {
      setLoading(false);
    }
  };

  // Restart RC server
  const restartRCServer = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/rclone/rc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restart' })
      });
      const data = await response.json();
      if (data.success) {
        await fetchRCStatus();
      }
    } catch (error) {
      console.error('Failed to restart RC server:', error);
    } finally {
      setLoading(false);
    }
  };

  // Set bandwidth limit
  const setBandwidthLimit = async () => {
    if (!bwRate.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/rclone/rc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'bwlimit',
          data: { rate: bwRate }
        })
      });
      const data = await response.json();
      if (data.rate) {
        await fetchBWLimit();
        setBwRate('');
      }
    } catch (error) {
      console.error('Failed to set bandwidth limit:', error);
    } finally {
      setLoading(false);
    }
  };

  // Format bytes
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format speed
  const formatSpeed = (bytesPerSecond: number): string => {
    return formatBytes(bytesPerSecond) + '/s';
  };

  // Format time
  const formatTime = (seconds: number): string => {
    if (seconds === 0) return '--';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  // Auto refresh effect
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      if (rcStatus?.running) {
        fetchJobs();
        fetchStats();
        fetchBWLimit();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [autoRefresh, rcStatus?.running]);

  // Initial data fetch
  useEffect(() => {
    fetchRCStatus();
  }, []);

  // Fetch data when RC server is running
  useEffect(() => {
    if (rcStatus?.running) {
      fetchJobs();
      fetchStats();
      fetchBWLimit();
    }
  }, [rcStatus?.running]);

  return (
    <div className="space-y-6">
      {/* RC Server Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                RC Server Control
              </CardTitle>
              <CardDescription>
                Manage rclone Remote Control server
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={rcStatus?.running ? "default" : "secondary"}>
                {rcStatus?.running ? "Running" : "Stopped"}
              </Badge>
              <div className="flex items-center gap-2">
                <Label htmlFor="auto-refresh">Auto Refresh</Label>
                <Switch
                  id="auto-refresh"
                  checked={autoRefresh}
                  onCheckedChange={setAutoRefresh}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button
              onClick={startRCServer}
              disabled={rcStatus?.running || loading}
              variant="outline"
              size="sm"
            >
              <Play className="h-4 w-4 mr-2" />
              Start
            </Button>
            <Button
              onClick={stopRCServer}
              disabled={!rcStatus?.running || loading}
              variant="outline"
              size="sm"
            >
              <Square className="h-4 w-4 mr-2" />
              Stop
            </Button>
            <Button
              onClick={restartRCServer}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Restart
            </Button>
            {rcStatus?.running && (
              <div className="text-sm text-muted-foreground">
                Server: {rcStatus.url}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {rcStatus?.running && (
        <Tabs defaultValue="stats" className="space-y-4">
          <TabsList>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
            <TabsTrigger value="jobs">Jobs</TabsTrigger>
            <TabsTrigger value="bandwidth">Bandwidth</TabsTrigger>
          </TabsList>

          {/* Statistics Tab */}
          <TabsContent value="stats">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Transfer Speed</CardTitle>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats ? formatSpeed(stats.speed) : '--'}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Transferred</CardTitle>
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats ? formatBytes(stats.bytes) : '--'}
                  </div>
                  {stats?.totalBytes > 0 && (
                    <Progress 
                      value={(stats.bytes / stats.totalBytes) * 100} 
                      className="mt-2"
                    />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Transfers</CardTitle>
                  <List className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats?.transfers || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.totalTransfers || 0} total
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">ETA</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats ? formatTime(stats.eta) : '--'}
                  </div>
                </CardContent>
              </Card>
            </div>

            {stats && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-lg">Detailed Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Files Checked:</span>
                      <div>{stats.checkes}</div>
                    </div>
                    <div>
                      <span className="font-medium">Files Deleted:</span>
                      <div>{stats.deletes}</div>
                    </div>
                    <div>
                      <span className="font-medium">Files Renamed:</span>
                      <div>{stats.renames}</div>
                    </div>
                    <div>
                      <span className="font-medium">Files Listed:</span>
                      <div>{stats.listed}</div>
                    </div>
                    <div>
                      <span className="font-medium">Errors:</span>
                      <div className={stats.errors > 0 ? "text-red-600" : ""}>
                        {stats.errors}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">Elapsed Time:</span>
                      <div>{formatTime(stats.elapsedTime)}</div>
                    </div>
                    <div>
                      <span className="font-medium">Fatal Error:</span>
                      <div>{stats.fatalError ? "Yes" : "No"}</div>
                    </div>
                    <div>
                      <span className="font-medium">Last Error:</span>
                      <div className="truncate">{stats.lastError || "None"}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Jobs Tab */}
          <TabsContent value="jobs">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Active Jobs</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {jobs.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No active jobs</p>
                      ) : (
                        jobs.map((job) => (
                          <div
                            key={job.id}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                              selectedJob?.id === job.id ? 'bg-accent' : 'hover:bg-accent/50'
                            }`}
                            onClick={() => setSelectedJob(job)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">#{job.id}</Badge>
                                {job.finished ? (
                                  job.success ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <AlertCircle className="h-4 w-4 text-red-600" />
                                  )
                                ) : (
                                  <Activity className="h-4 w-4 text-blue-600" />
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {job.duration ? formatTime(job.duration) : '--'}
                              </div>
                            </div>
                            {job.error && (
                              <p className="text-xs text-red-600 mt-1 truncate">{job.error}</p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {selectedJob && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Job Details #{selectedJob.id}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Status:</span>
                        <div className="flex items-center gap-2 mt-1">
                          {selectedJob.finished ? (
                            selectedJob.success ? (
                              <Badge variant="default">Completed</Badge>
                            ) : (
                              <Badge variant="destructive">Failed</Badge>
                            )
                          ) : (
                            <Badge variant="secondary">Running</Badge>
                          )}
                        </div>
                      </div>
                      {selectedJob.startTime && (
                        <div>
                          <span className="font-medium">Start Time:</span>
                          <div>{new Date(selectedJob.startTime).toLocaleString()}</div>
                        </div>
                      )}
                      {selectedJob.endTime && (
                        <div>
                          <span className="font-medium">End Time:</span>
                          <div>{new Date(selectedJob.endTime).toLocaleString()}</div>
                        </div>
                      )}
                      {selectedJob.duration && (
                        <div>
                          <span className="font-medium">Duration:</span>
                          <div>{formatTime(selectedJob.duration)}</div>
                        </div>
                      )}
                      {selectedJob.error && (
                        <div>
                          <span className="font-medium">Error:</span>
                          <div className="text-red-600">{selectedJob.error}</div>
                        </div>
                      )}
                      {selectedJob.output && (
                        <div>
                          <span className="font-medium">Output:</span>
                          <ScrollArea className="h-32 mt-1">
                            <pre className="text-xs bg-muted p-2 rounded">
                              {JSON.stringify(selectedJob.output, null, 2)}
                            </pre>
                          </ScrollArea>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Bandwidth Tab */}
          <TabsContent value="bandwidth">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Bandwidth Control</CardTitle>
                <CardDescription>
                  Set bandwidth limits for rclone operations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label htmlFor="bw-rate">Bandwidth Limit</Label>
                    <Input
                      id="bw-rate"
                      placeholder="e.g., 1M, 100k, off"
                      value={bwRate}
                      onChange={(e) => setBwRate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <Button onClick={setBandwidthLimit} disabled={loading || !bwRate.trim()}>
                    Set Limit
                  </Button>
                </div>

                {bwlimit && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                    <div>
                      <span className="font-medium">Current Limit:</span>
                      <div className="text-lg">{bwlimit.rate}</div>
                    </div>
                    <div>
                      <span className="font-medium">Upload:</span>
                      <div className="text-lg">{formatSpeed(bwlimit.bytesPerSecondTx)}</div>
                    </div>
                    <div>
                      <span className="font-medium">Download:</span>
                      <div className="text-lg">{formatSpeed(bwlimit.bytesPerSecondRx)}</div>
                    </div>
                  </div>
                )}

                <div className="text-sm text-muted-foreground">
                  <p>Examples:</p>
                  <ul className="list-disc list-inside mt-1">
                    <li>off - No bandwidth limit</li>
                    <li>1M - 1 MB/s limit</li>
                    <li>100k - 100 KB/s limit</li>
                    <li>1M:100k - 1 MB/s upload, 100 KB/s download</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}