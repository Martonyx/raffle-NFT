"use client";
import { Contract, providers, utils, ethers, BigNumber } from "ethers";
import React, { useEffect, useRef, useState } from "react";
import Web3Modal from "web3modal";
import { abi, RaffleNFT_CONTRACT_ADDRESS } from "./constants";

export default function Home() {
  const [walletConnected, setWalletConnected] = useState(false);
  // totalTickets
  const [totalTickets, setTotalTickets] = useState("0");
  //amount of tickets
  const [ticketPrice, setTicketPrice] = useState("0");
  //set eth amount
  const [ethAmount, setEthAmount] = useState("0");
  // loading is set to true when we are waiting for a transaction to get mined
  const [loading, setLoading] = useState(false);
  // checks if the currently connected MetaMask wallet is the owner of the contract
  const [isOwner, setIsOwner] = useState(false);
  // tokenIdsMinted keeps track of the number of tokenIds that have been minted
  const [tokenIdsMinted, setTokenIdsMinted] = useState("0");
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [winnerAddress, setWinnerAddress] = useState("");
  const [remainingTickets, setRemainingTickets] = useState(0);
  const [buyAmount, setBuyAmount] = useState(1);
  // Create a reference to the Web3 Modal (used for connecting to Metamask) which persists as long as the page is open
  const web3ModalRef = useRef();

  const connectWallet = async () => {
    try {
      // Get the provider from web3Modal, which in our case is MetaMask
      // When used for the first time, it prompts the user to connect their wallet
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (err) {
      console.error(err);
    }
  };

  const getProviderOrSigner = async (needSigner = false) => {
    // Connect to Metamask
    // Since we store `web3Modal` as a reference, we need to access the `current` value to get access to the underlying object
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    // If user is not connected to the Sepolia network, let them know and throw an error
    const { chainId } = await web3Provider.getNetwork();
    if (chainId !== 11155111) {
      window.alert("Change the network to Sepolia");
      throw new Error("Change network to Sepolia");
    }

    if (needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  };

  useEffect(() => {
    // if wallet is not connected, create a new instance of Web3Modal and connect the MetaMask wallet
    if (!walletConnected) {
      // Assign the Web3Modal class to the reference object by setting it's `current` value
      // The `current` value is persisted throughout as long as this page is open
      web3ModalRef.current = new Web3Modal({
        network: "sepolia",
        providerOptions: {},
        disableInjectedProvider: false,
      });
      connectWallet();
    }
  }, [walletConnected]);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const signer = await getProviderOrSigner(true);
    setWalletConnected(true);

    const raffleContract = new ethers.Contract(
      RaffleNFT_CONTRACT_ADDRESS,
      abi,
      signer
    );

    const price = await raffleContract.getTicketPrice();
    const winner = await raffleContract.getWinnerAddress();
    const total = await raffleContract.getTotalTickets();
    const remaining = await raffleContract.getRemainingTickets();

    setContract(raffleContract);
    setTicketPrice(price / BigNumber.from(1000000000000000000n).toString());
    setWinnerAddress(winner);
    setTotalTickets(total.toNumber());
    setRemainingTickets(remaining.toNumber());

    const currentAccount = (await signer.getAddress()).toLowerCase();
    setAccount(currentAccount);
  };

  const buyTickets = async () => {
    if (!contract) return;

    const value = ethers.utils.parseEther((ticketPrice * buyAmount).toString());
    const overrides = { value: BigNumber.from(value) };
    const tx = await contract.buyTickets(buyAmount, overrides);
    await tx.wait();

    // Refresh the ticket and remaining ticket counts
    const total = await contract.getTotalTickets();
    const remaining = await contract.getRemainingTickets();
    setTotalTickets(total.toNumber());
    setRemainingTickets(remaining.toNumber());
  };

  const renderButton = () => {
    // If wallet is not connected, return a button which allows them to connect their wallet
    if (!walletConnected) {
      return (
        <div className="flex justify-end m-0 p-0">
          <button
            onClick={connectWallet}
            className="bg-white hover:bg-blue-700 text-gray font-bold py-2 px-4 mt-5 mr-4 rounded"
          >
            connect wallet
          </button>
        </div>
      );
    }

    if (walletConnected) {
      return (
        <div className="flex justify-end m-0 p-0">
          <button className="bg-white hover:bg-blue-700 text-gray font-bold py-2 px-4 mt-5 mr-4 rounded">
            connected
          </button>
        </div>
      );
    }

    //   if (loading) {
    //     return (
    //         <button
    //         onClick={handleClick}
    //         disabled={loading}
    //         className={`px-4 py-2 rounded-md ${
    //           loading
    //             ? 'bg-gray-500 cursor-not-allowed'
    //             : 'bg-blue-500 hover:bg-blue-600'
    //         } text-white`}
    //       >
    //         {loading ? 'Loading...' : buttonText}
    //       </button>
    //     )
    //   }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-blue-500 py-4">
        <div className="container mx-auto">
          <h1 className="text-white text-3xl font-bold">
            Welcome to Our NFT Raffle Page
          </h1>
          {renderButton()}
        </div>
      </header>

      <section className="flex-grow bg-gray-100 py-6">
        <div className="container mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4"></h2>
          <p className="text-gray-600">
            buy a ticket to secure your chance to win an amazing NFT
          </p>
        </div>
      </section>

      <section className="bg-gray-200 py-8 mt--21">
        <div className="container mx-auto">
          <h2 className="text-2xl font-bold mb-4 text-center">Buy Tickets</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <p className="bg-blue-300 py-2 px-1 rounded overflow-hidden">
              Connected Account: {account}
            </p>
            <p className="bg-blue-300 py-2 px-1 rounded">
              Ticket Price: {ticketPrice} Eth
            </p>
            <p className="bg-blue-300 py-2 px-1 rounded overflow-hidden">
              Winner Address: {winnerAddress}
            </p>
            <p className="bg-blue-300 py-2 px-1 rounded">
              Total Tickets: {totalTickets}
            </p>
            <p className="bg-blue-300 py-2 px-1 rounded">
              Remaining Tickets: {remainingTickets}
            </p>
            <input
              className="rounded my-1 px-2 h-10 outline-none"
              type="number"
              value={buyAmount}
              onChange={(e) => setBuyAmount(e.target.value)}
            />
          </div>
          <button
            className="bg-blue-500 mt-2 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={buyTickets}
          >
            buy tickets
          </button>
        </div>
      </section>

      <footer className="bg-gray-800 text-white py-4">
        <div className="container mx-auto text-center">
          <p>&copy; 2023 Martonyx. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
