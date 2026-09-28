import { NextRequest, NextResponse } from 'next/server';

// Local self-hosted demo only. Keep the provider key on the server and expose
// the read methods needed by wagmi and SDK history reconstruction.
const allowed = new Set([
  'eth_chainId',
  'eth_blockNumber',
  'eth_call',
  'eth_getBalance',
  'eth_getCode',
  'eth_getLogs',
  'eth_getBlockByNumber',
  'eth_getTransactionByHash',
  'eth_getTransactionReceipt',
  'eth_getTransactionCount',
  'eth_estimateGas',
  'eth_gasPrice',
  'eth_maxPriorityFeePerGas',
  'eth_feeHistory',
]);

export async function POST(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_SELF_HOSTED !== 'true' || !process.env.SEPOLIA_RPC_URL) {
    return NextResponse.json({ error: 'Self-hosted RPC is not configured' }, { status: 503 });
  }
  try {
    const body = await request.json();
    const calls = Array.isArray(body) ? body : [body];
    if (!calls.length || calls.length > 100 || calls.some((call) => !allowed.has(call?.method))) {
      return NextResponse.json({ error: 'Unsupported RPC method or batch size' }, { status: 400 });
    }
    const upstream = await fetch(process.env.SEPOLIA_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(30_000),
    });
    if (!upstream.ok) return NextResponse.json({ error: 'RPC provider unavailable' }, { status: 502 });
    return NextResponse.json(await upstream.json());
  } catch {
    return NextResponse.json({ error: 'RPC request failed' }, { status: 502 });
  }
}
