import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

const RC_PORT = 5572;
const RC_HOST = 'localhost';

// Check if RC server is running
async function isRCServerRunning(): Promise<boolean> {
  try {
    const response = await fetch(`http://${RC_HOST}:${RC_PORT}/core/pid`);
    return response.ok;
  } catch {
    return false;
  }
}

// Start RC server
async function startRCServer(): Promise<{ success: boolean; message: string; pid?: number }> {
  try {
    // Check if rclone is installed
    const { stdout } = await execAsync('which rclone');
    if (!stdout.trim()) {
      return { success: false, message: 'rclone is not installed' };
    }

    // Start RC server in background
    const { stdout: pidOutput } = await execAsync(
      `nohup rclone rc --addr ${RC_HOST}:${RC_PORT} --rc-no-auth > /dev/null 2>&1 & echo $!`
    );
    
    const pid = parseInt(pidOutput.trim());
    
    // Wait a moment for server to start
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verify server is running
    if (await isRCServerRunning()) {
      return { 
        success: true, 
        message: `RC server started on http://${RC_HOST}:${RC_PORT}`,
        pid 
      };
    } else {
      return { success: false, message: 'Failed to start RC server' };
    }
  } catch (error) {
    return { 
      success: false, 
      message: `Error starting RC server: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

// Stop RC server
async function stopRCServer(): Promise<{ success: boolean; message: string }> {
  try {
    // Find and kill rclone RC processes
    const { stdout } = await execAsync(`pgrep -f "rclone rc"`);
    const pids = stdout.trim().split('\n').filter(pid => pid.trim());
    
    if (pids.length === 0) {
      return { success: true, message: 'No RC server processes found' };
    }

    for (const pid of pids) {
      await execAsync(`kill ${pid}`);
    }

    // Wait a moment for processes to stop
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify server is stopped
    if (!(await isRCServerRunning())) {
      return { success: true, message: `RC server stopped (${pids.length} processes killed)` };
    } else {
      // Force kill if still running
      for (const pid of pids) {
        await execAsync(`kill -9 ${pid}`).catch(() => {});
      }
      return { success: true, message: `RC server force stopped (${pids.length} processes killed)` };
    }
  } catch (error) {
    return { 
      success: false, 
      message: `Error stopping RC server: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

// Make RC API call
async function makeRCCall(endpoint: string, data?: any): Promise<any> {
  try {
    const url = `http://${RC_HOST}:${RC_PORT}/${endpoint}`;
    const response = await fetch(url, {
      method: data ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    throw new Error(`RC API call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const endpoint = searchParams.get('endpoint');

    switch (action) {
      case 'status':
        const isRunning = await isRCServerRunning();
        return NextResponse.json({
          running: isRunning,
          url: `http://${RC_HOST}:${RC_PORT}`,
          message: isRunning ? 'RC server is running' : 'RC server is not running'
        });

      case 'stats':
        if (!await isRCServerRunning()) {
          return NextResponse.json({ error: 'RC server is not running' }, { status: 400 });
        }
        const stats = await makeRCCall('core/stats');
        return NextResponse.json(stats);

      case 'jobs':
        if (!await isRCServerRunning()) {
          return NextResponse.json({ error: 'RC server is not running' }, { status: 400 });
        }
        const jobs = await makeRCCall('job/list');
        return NextResponse.json(jobs);

      case 'jobstatus':
        if (!await isRCServerRunning()) {
          return NextResponse.json({ error: 'RC server is not running' }, { status: 400 });
        }
        const jobId = searchParams.get('jobid');
        if (!jobId) {
          return NextResponse.json({ error: 'jobid parameter is required' }, { status: 400 });
        }
        const jobStatus = await makeRCCall('job/status', { jobid: parseInt(jobId) });
        return NextResponse.json(jobStatus);

      case 'bwlimit':
        if (!await isRCServerRunning()) {
          return NextResponse.json({ error: 'RC server is not running' }, { status: 400 });
        }
        const bwlimit = await makeRCCall('core/bwlimit');
        return NextResponse.json(bwlimit);

      case 'transferred':
        if (!await isRCServerRunning()) {
          return NextResponse.json({ error: 'RC server is not running' }, { status: 400 });
        }
        const transferred = await makeRCCall('core/transferred');
        return NextResponse.json(transferred);

      case 'options':
        if (!await isRCServerRunning()) {
          return NextResponse.json({ error: 'RC server is not running' }, { status: 400 });
        }
        const options = await makeRCCall('options/get');
        return NextResponse.json(options);

      default:
        if (endpoint) {
          if (!await isRCServerRunning()) {
            return NextResponse.json({ error: 'RC server is not running' }, { status: 400 });
          }
          const result = await makeRCCall(endpoint);
          return NextResponse.json(result);
        }
        return NextResponse.json({ error: 'Invalid action or endpoint' }, { status: 400 });
    }
  } catch (error) {
    console.error('RC API GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, endpoint, data } = body;

    switch (action) {
      case 'start':
        const startResult = await startRCServer();
        return NextResponse.json(startResult);

      case 'stop':
        const stopResult = await stopRCServer();
        return NextResponse.json(stopResult);

      case 'restart':
        await stopRCServer();
        await new Promise(resolve => setTimeout(resolve, 1000));
        const restartResult = await startRCServer();
        return NextResponse.json(restartResult);

      case 'bwlimit':
        if (!await isRCServerRunning()) {
          return NextResponse.json({ error: 'RC server is not running' }, { status: 400 });
        }
        const rate = data?.rate;
        if (!rate) {
          return NextResponse.json({ error: 'rate parameter is required' }, { status: 400 });
        }
        const bwlimitResult = await makeRCCall('core/bwlimit', { rate });
        return NextResponse.json(bwlimitResult);

      case 'options':
        if (!await isRCServerRunning()) {
          return NextResponse.json({ error: 'RC server is not running' }, { status: 400 });
        }
        const optionsResult = await makeRCCall('options/set', data);
        return NextResponse.json(optionsResult);

      case 'sync':
      case 'copy':
      case 'move':
        if (!await isRCServerRunning()) {
          return NextResponse.json({ error: 'RC server is not running' }, { status: 400 });
        }
        const syncData = { ...data, _async: true };
        const syncResult = await makeRCCall(`sync/${action}`, syncData);
        return NextResponse.json(syncResult);

      case 'operations':
        if (!await isRCServerRunning()) {
          return NextResponse.json({ error: 'RC server is not running' }, { status: 400 });
        }
        if (!endpoint) {
          return NextResponse.json({ error: 'endpoint parameter is required for operations' }, { status: 400 });
        }
        const opsResult = await makeRCCall(`operations/${endpoint}`, data);
        return NextResponse.json(opsResult);

      default:
        if (endpoint) {
          if (!await isRCServerRunning()) {
            return NextResponse.json({ error: 'RC server is not running' }, { status: 400 });
          }
          const result = await makeRCCall(endpoint, data);
          return NextResponse.json(result);
        }
        return NextResponse.json({ error: 'Invalid action or endpoint' }, { status: 400 });
    }
  } catch (error) {
    console.error('RC API POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'job':
        if (!await isRCServerRunning()) {
          return NextResponse.json({ error: 'RC server is not running' }, { status: 400 });
        }
        const jobId = searchParams.get('jobid');
        if (!jobId) {
          return NextResponse.json({ error: 'jobid parameter is required' }, { status: 400 });
        }
        // Note: rclone doesn't have a direct job delete endpoint
        // Jobs are automatically cleaned up after completion
        return NextResponse.json({ message: 'Jobs are automatically cleaned up after completion' });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('RC API DELETE error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}