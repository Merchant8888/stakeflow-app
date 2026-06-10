'use client';
import { useState, useEffect } from 'react';
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useConnect,
  useDisconnect,
  useSwitchChain,
} from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { parseEther, formatEther } from 'viem';

const TOKEN_ADDRESS = '0x6511f1B92bB9718C75513A9fbCbD8D92A63B1410' as `0x${string}`;
const STAKING_ADDRESS = '0x772267ec783cb5D987908B675990683C957217eB' as `0x${string}`;

const TOKEN_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

const STAKING_ABI = [
  {
    name: 'stake',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_amount', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'withdraw',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'getStake',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_user', type: 'address' }],
    outputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'rewards', type: 'uint256' },
    ],
  },
] as const;

function ConnectWallet() {
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { isConnected, address } = useAccount();
  const [showList, setShowList] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return (
    <button className="bg-blue-600 px-4 py-2 rounded-xl text-sm font-medium">
      Connect Wallet
    </button>
  );

  if (isConnected) return (
    <button
      onClick={() => disconnect()}
      className="bg-gray-800 px-3 py-2 rounded-xl text-sm"
    >
      {address?.slice(0, 6)}...{address?.slice(-4)} ✕
    </button>
  );

  return (
    <div className="relative">
      <button
        onClick={() => setShowList(!showList)}
        className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl text-sm font-medium"
      >
        Connect Wallet
      </button>
      {showList && (
        <div className="absolute right-0 mt-2 bg-gray-800 rounded-xl overflow-hidden shadow-xl z-10 min-w-48">
          {connectors.map((connector) => (
            <button
              key={connector.id}
              onClick={() => { connect({ connector }); setShowList(false); }}
              className="w-full text-left px-4 py-3 hover:bg-gray-700 text-sm"
            >
              {connector.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const { isConnected, address, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<'approve' | 'stake'>('approve');

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const { data: tokenBalance } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: TOKEN_ABI,
    functionName: 'balanceOf',
    args: [address!],
    query: { enabled: !!address },
  });

  const { data: stakeData } = useReadContract({
    address: STAKING_ADDRESS,
    abi: STAKING_ABI,
    functionName: 'getStake',
    args: [address!],
    query: { enabled: !!address },
  });

  const isWrongNetwork = isConnected && chain?.id !== sepolia.id;

  const handleApprove = () => {
    if (!amount) return;
    writeContract({
      address: TOKEN_ADDRESS,
      abi: TOKEN_ABI,
      functionName: 'approve',
      args: [STAKING_ADDRESS, parseEther(amount)],
    });
    setStep('stake');
  };

  const handleStake = () => {
    if (!amount) return;
    writeContract({
      address: STAKING_ADDRESS,
      abi: STAKING_ABI,
      functionName: 'stake',
      args: [parseEther(amount)],
    });
  };

  const handleWithdraw = () => {
    writeContract({
      address: STAKING_ADDRESS,
      abi: STAKING_ABI,
      functionName: 'withdraw',
    });
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white p-4">
      <div className="max-w-md mx-auto">
        <div className="flex justify-between items-center mb-8 pt-4">
          <div>
            <h1 className="text-2xl font-bold">⚡ StakeFlow</h1>
            <p className="text-gray-400 text-sm">Stake SFT. Earn rewards.</p>
          </div>
          <ConnectWallet />
        </div>

        {isWrongNetwork && (
          <button
            onClick={() => switchChain({ chainId: sepolia.id })}
            className="w-full bg-red-600 hover:bg-red-500 py-3 rounded-xl text-sm font-medium mb-4"
          >
            ⚠️ Wrong network — click to switch to Sepolia
          </button>
        )}

        {!isConnected ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-4xl mb-4">⚡</p>
            <p className="text-lg mb-2">Connect your wallet to start staking</p>
            <p className="text-sm">Stake SFT tokens and earn rewards over time</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-900 rounded-2xl p-4">
                <p className="text-gray-400 text-xs mb-1">SFT Balance</p>
                <p className="text-xl font-bold">
                  {tokenBalance ? Number(formatEther(tokenBalance)).toFixed(2) : '0.00'}
                </p>
              </div>
              <div className="bg-gray-900 rounded-2xl p-4">
                <p className="text-gray-400 text-xs mb-1">Staked</p>
                <p className="text-xl font-bold">
                  {stakeData ? Number(formatEther(stakeData[0])).toFixed(2) : '0.00'}
                </p>
              </div>
              <div className="bg-gray-900 rounded-2xl p-4 col-span-2">
                <p className="text-gray-400 text-xs mb-1">Rewards Earned</p>
                <p className="text-xl font-bold text-green-400">
                  {stakeData ? Number(formatEther(stakeData[1])).toFixed(4) : '0.0000'} SFT
                </p>
              </div>
            </div>

            <div className="bg-gray-900 rounded-2xl p-5 mb-4">
              <h2 className="font-semibold mb-4">Stake Tokens</h2>
              <input
                type="number"
                placeholder="Amount to stake"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full bg-gray-800 rounded-xl p-3 text-white placeholder-gray-500 outline-none mb-3"
              />
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleApprove}
                  disabled={isPending || isConfirming || !amount}
                  className="bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-700 py-3 rounded-xl font-medium transition text-sm"
                >
                  {step === 'approve' ? '1. Approve' : '✓ Approved'}
                </button>
                <button
                  onClick={handleStake}
                  disabled={isPending || isConfirming || !amount || step === 'approve'}
                  className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 py-3 rounded-xl font-medium transition text-sm"
                >
                  2. Stake
                </button>
              </div>
            </div>

            <div className="bg-gray-900 rounded-2xl p-5">
              <h2 className="font-semibold mb-2">Withdraw</h2>
              <p className="text-gray-400 text-sm mb-4">
                Withdraw your staked tokens and all earned rewards
              </p>
              <button
                onClick={handleWithdraw}
                disabled={isPending || isConfirming || !stakeData || stakeData[0] === 0n}
                className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-700 py-3 rounded-xl font-medium transition"
              >
                Withdraw All + Rewards
              </button>
            </div>

            {(isPending || isConfirming) && (
              <p className="text-center text-yellow-400 text-sm mt-4">
                {isPending ? '⏳ Confirm in wallet...' : '⛓️ Transaction confirming...'}
              </p>
            )}
            {isSuccess && (
              <p className="text-center text-green-400 text-sm mt-4">
                ✅ Transaction confirmed!
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}
