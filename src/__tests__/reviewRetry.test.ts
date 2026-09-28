import { act, createElement, type ReactNode } from 'react';
import { afterEach, expect, it, jest } from '@jest/globals';
import { createRoot, type Root } from 'react-dom/client';
import { EventType, ModalType } from '~/types';

type Props = { children?: ReactNode; onClick?: () => void; disabled?: boolean; 'data-testid'?: string };
const element = (tag: string) =>
  function TestElement({ children, onClick, disabled, 'data-testid': testId }: Props) {
    return createElement(tag, { onClick, disabled, 'data-testid': testId }, children);
  };
const Box = element('div');
const Button = element('button');
jest.unstable_mockModule('@mui/material', () => ({
  Box,
  Button,
  CircularProgress: element('span'),
  Stack: Box,
  Typography: Box,
  styled: (component: typeof Box) => () => component,
}));
jest.unstable_mockModule('@mui/icons-material/InfoOutlined', () => ({ default: () => null }));
jest.unstable_mockModule(`${process.cwd()}/src/components/index.ts`, () => ({ BaseModal: Box }));
jest.unstable_mockModule(`${process.cwd()}/src/utils/index.ts`, () => ({ poolDecimals: () => 18 }));
for (const [file, name] of [
  ['Deposit/index.ts', 'ModalContainer'],
  ['LinksSection.tsx', 'LinksSection'],
  ['Review/DataSection.tsx', 'DataSection'],
  ['Review/ExitMessage.tsx', 'ExitMessage'],
  ['Review/PoolAccountSection.tsx', 'PoolAccountSection'],
]) {
  jest.unstable_mockModule(`${process.cwd()}/src/containers/Modals/${file}`, () =>
    name === 'ModalContainer' ? { ModalContainer: Box, ModalTitle: Box } : { [name]: () => null },
  );
}
let modalOpen = ModalType.REVIEW;
const commitQuote = jest.fn<() => Promise<unknown>>().mockResolvedValue({
  kind: 'committed',
  feeCommitment: {},
  price: { feeBPS: '70' },
});
const quote = {
  quoteState: { pendingQuoteRequest: false, extraGas: false },
  clearPendingQuoteRequest: jest.fn(),
  clearCommitment: jest.fn(),
};
jest.unstable_mockModule(`${process.cwd()}/src/contexts/QuoteContext.tsx`, () => ({ useQuoteContext: () => quote }));
jest.unstable_mockModule(`${process.cwd()}/src/hooks/index.ts`, () => ({
  useModal: () => ({
    modalOpen,
    isClosable: true,
    setModalOpen: (next: ModalType) => {
      modalOpen = next;
    },
  }),
  useDeposit: () => ({ deposit: jest.fn(), isLoading: false }),
  useWithdraw: () => ({ isLoading: false }),
  useExit: () => ({ isLoading: false }),
  usePoolAccountsContext: () => ({
    actionType: EventType.WITHDRAWAL,
    amount: '0.1',
    target: '0x3434343434343434343434343434343434343434',
    setFeeCommitment: jest.fn(),
    setFeeBPSForWithdraw: jest.fn(),
  }),
  useChainContext: () => ({ balanceBN: 0n, selectedPoolInfo: { asset: 'ETH' }, chainId: 11155111 }),
  useExternalServices: () => ({
    currentSelectedRelayerData: { url: 'http://localhost:3001', relayerAddress: '0x12' },
    relayerData: {},
  }),
  useNotifications: () => ({ addNotification: jest.fn() }),
  useRequestQuote: () => ({
    isPriceCurrent: true,
    isPriceStale: false,
    canRequestQuote: true,
    requestNewQuote: jest.fn(),
    commitQuote,
  }),
}));
const { ReviewModal } = await import('~/containers/Modals/Review/Review');
let root: Root;
afterEach(async () => {
  if (root) await act(async () => root.unmount());
});

it('allows confirming unchanged withdrawal details after a rejected attempt returns to review', async () => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement('div');
  root = createRoot(container);
  const render = () => act(async () => root.render(createElement(ReviewModal)));
  await render();
  const confirm = () => container.querySelector('[data-testid="confirm-review-button"]') as HTMLButtonElement;
  await act(async () => confirm().click());
  expect(commitQuote).toHaveBeenCalledTimes(1);
  expect(modalOpen).toBe(ModalType.GENERATE_ZK_PROOF);
  // Relay rejection returns to the form. The amount and recipient stay unchanged.
  modalOpen = ModalType.WITHDRAW;
  await render();
  modalOpen = ModalType.REVIEW;
  await render();
  expect(confirm().disabled).toBe(false);
  await act(async () => confirm().click());
  expect(commitQuote).toHaveBeenCalledTimes(2);
});
