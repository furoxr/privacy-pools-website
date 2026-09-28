import { afterEach, expect, it, jest } from '@jest/globals';

const originalEnv = { ...process.env };
afterEach(() => {
  process.env = { ...originalEnv };
  jest.resetModules();
});

it('routes global and chain-specific requests to the local ASP in self-hosted mode', async () => {
  process.env.NEXT_PUBLIC_SELF_HOSTED = 'true';
  process.env.NEXT_PUBLIC_ASP_ENDPOINT_TEST = 'http://127.0.0.1:3002';
  delete process.env.NEXT_PUBLIC_ASP_ENDPOINT_NON_TEST;
  jest.resetModules();
  const { getAspEndpointForChain } = await import('~/config/env');
  for (const chainId of [1, 11155111, 31337]) {
    expect(getAspEndpointForChain(chainId)).toBe('http://127.0.0.1:3002');
  }
});

it('preserves the original production and testnet ASP split outside self-hosted mode', async () => {
  process.env.NEXT_PUBLIC_SELF_HOSTED = 'false';
  process.env.NEXT_PUBLIC_ASP_ENDPOINT_TEST = 'https://test.example';
  process.env.NEXT_PUBLIC_ASP_ENDPOINT_NON_TEST = 'https://production.example';
  jest.resetModules();
  const { getAspEndpointForChain } = await import('~/config/env');
  expect(getAspEndpointForChain(1)).toBe('https://production.example');
  expect(getAspEndpointForChain(11155111)).toBe('https://test.example');
});
