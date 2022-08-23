// importfunctionalities
import React, { Fragment } from 'react';
import logo from './logo.svg';
import './App.css';
import { PublicKey, Transaction, Keypair, Connection, clusterApiUrl, LAMPORTS_PER_SOL, SystemProgram, sendAndConfirmTransaction } from '@solana/web3.js';

import { useEffect, useState } from 'react';

//Bootstrap
import 'bootstrap/dist/css/bootstrap.min.css';
import { Button } from 'react-bootstrap';
import Card from 'react-bootstrap/Card';
import Modal from 'react-bootstrap/Modal';
import Alert from 'react-bootstrap/Alert';

// create types
type DisplayEncoding = 'utf8' | 'hex';

type PhantomEvent = 'disconnect' | 'connect' | 'accountChanged';
type PhantomRequestMethod = 'connect' | 'disconnect' | 'signTransaction' | 'signAllTransactions' | 'signMessage';

interface ConnectOpts {
  onlyIfTrusted: boolean;
}

// create a provider interface (hint: think of this as an object) to store the Phantom Provider
interface PhantomProvider {
  publicKey: PublicKey | null;
  isConnected: boolean | null;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
  signMessage: (message: Uint8Array | string, display?: DisplayEncoding) => Promise<any>;
  connect: (opts?: Partial<ConnectOpts>) => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  on: (event: PhantomEvent, handler: (args: any) => void) => void;
  request: (method: PhantomRequestMethod, params: any) => Promise<unknown>;
}

/**
 * @description gets Phantom provider, if it exists
 */
const getProvider = (): PhantomProvider | undefined => {
  if ('solana' in window) {
    // @ts-ignore
    const provider = window.solana as any;
    if (provider.isPhantom) return provider as PhantomProvider;
  }
};

window.Buffer = window.Buffer || require('buffer').Buffer;

function App() {
  // create state variable for the provider
  const [provider, setProvider] = useState<PhantomProvider | undefined>(undefined);

  // create state variable for the wallet key
  const [walletKey, setWalletKey] = useState<PhantomProvider | undefined>(undefined);

  //generated wallet key
  const [secKey, setSecKey] = useState<any>();
  const [pubKey, setpubKey] = useState('');
  //wallet balance
  const [balance, setBalance] = useState(0);
  const [signature, setSignature] = useState('');
  const [isLoading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const [isError, setIsError] = useState(false);
  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  // this is the function that runs whenever the component updates (e.g. render, refresh)
  useEffect(() => {
    const provider = getProvider();

    // if the phantom provider exists, set this as the provider
    if (provider) setProvider(provider);
    else setProvider(undefined);
  }, []);

  function simulateNetworkRequest() {
    return new Promise(resolve => setTimeout(resolve, 1000));
  }

  useEffect(() => {
    if (isLoading) {
      simulateNetworkRequest().then(() => {
        setLoading(false);
      });
    }
  }, [isLoading]);

  /**
   * @description prompts user to connect wallet if it exists.
   * This function is called when the connect wallet button is clicked
   */

  //Connect Wallet
  const connectWallet = async () => {
    // @ts-ignore
    const { solana } = window;

    // checks if phantom wallet exists
    if (solana) {
      try {
        // connects wallet and returns response which includes the wallet public key
        const response = await solana.connect();
        console.log('wallet account ', response.publicKey.toString());
        // update walletKey to be the public key
        setWalletKey(response.publicKey.toString());
      } catch (err) {
        // { code: 4001, message: 'User rejected the request.' }
      }
    }
  };

  //Disconnect Wallet
  const disconnectWallet = async () => {
    // @ts-ignore
    const { solana } = window;
    if (solana) {
      try {
        await solana.disconnect();
        // update walletKey to be the public key
        setWalletKey(undefined);
      } catch (err) {
        // { code: 4001, message: 'User rejected the request.' }
      }
    }
  };

  //Create an account
  const createAccount = async () => {
    const newPair = new Keypair();
    const pubKey = newPair.publicKey.toString();
    const secKey = newPair.secretKey;
    setSecKey(secKey);
    setpubKey(pubKey);
    setLoading(true);
  };

  //Update Balance
  const getWalletBalance = async () => {
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    const walletBalance = await connection.getBalance(new PublicKey(pubKey));
    setBalance(walletBalance);
  };

  //Airdrop Sol
  const sendAirdropSol = async () => {
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    const fromAirDropSignature = await connection.requestAirdrop(new PublicKey(pubKey), 2 * LAMPORTS_PER_SOL);
    let latestBlockHash = await connection.getLatestBlockhash();
    // to check for transaction expiration
    await connection.confirmTransaction({
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: fromAirDropSignature,
    });
    await getWalletBalance();
  };

  //Transfer Sol
  const transferSol = async () => {
    // @ts-ignore
    const { solana } = window;

    // checks if phantom wallet exists
    if (solana) {
      try {
        // connects wallet and returns response which includes the wallet public key
        const response = await solana.connect();
        const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: new PublicKey(pubKey),
            toPubkey: response.publicKey,
            lamports: 2 * LAMPORTS_PER_SOL,
          })
        );
        // Sign transaction
        const signature = await sendAndConfirmTransaction(connection, transaction, [Keypair.fromSecretKey(secKey)]);
        setSignature(signature);
        await getWalletBalance();
        setIsError(false);
        handleShow();
      } catch (err) {
        // { code: 4001, message: 'User rejected the request.' }
        setIsError(true);
        handleShow();
        console.log('Insufficient Balance');
      }
    }
  };

  // HTML code for the app
  return (
    <div className="App">
      <Button className="mb-3" variant="primary" size="lg" disabled={pubKey ? true : false} onClick={createAccount}>
        {isLoading ? 'Creating Account...' : 'Create New Solana Account'}
      </Button>
      {pubKey && !isLoading && (
        <>
          <Card className="mb-3">
            <Card.Header as="h5">New Account Created!</Card.Header>
            <Card.Body>
              <Card.Title as="p">Address: {pubKey}</Card.Title>
              <Card.Text as="p">
                Balance: <span style={{ color: balance / LAMPORTS_PER_SOL <= 2 ? 'red' : 'green' }}>{`${balance / LAMPORTS_PER_SOL} SOL`}</span>{' '}
              </Card.Text>
              <Button variant="primary" onClick={sendAirdropSol}>
                Airdrop SOL
              </Button>
            </Card.Body>
          </Card>
        </>
      )}
      {provider && !walletKey && pubKey && !isLoading && (
        <Button variant="outline-success" onClick={connectWallet}>
          Connect To Phantom Wallet
        </Button>
      )}
      {provider && walletKey && (
        <>
          <Card className="mb-3">
            <Card.Header as="h5">Phantom Wallet Account</Card.Header>
            <Card.Body>
              <Card.Title as="p">Address: {walletKey.toString()}</Card.Title>
              <Button variant="primary" onClick={transferSol}>
                Transfer to new wallet
              </Button>
            </Card.Body>
          </Card>
          {balance <= 2 * LAMPORTS_PER_SOL && <Alert variant="warning">To transfer SOL, Account balance must be more than 2 SOL</Alert>}

          <Modal centered show={show} onHide={handleClose}>
            <Modal.Header closeButton>
              <Modal.Title>{isError ? 'Insufficient Balance' : 'Transfer Successfully'}</Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ wordBreak: 'break-all' }} as="p">
              {isError ? 'Airdrop more SOL to the account' : `Signature: ${signature}`}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={handleClose}>
                Close
              </Button>
            </Modal.Footer>
          </Modal>

          <button
            style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              fontSize: '16px',
              padding: '15px',
              fontWeight: 'bold',
              borderRadius: '5px',
              backgroundColor: '#dc3545',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
            }}
            onClick={disconnectWallet}
          >
            Disconnect
          </button>
        </>
      )}
      {!provider && pubKey && !isLoading && (
        <>
          <Alert variant="danger">
            No provider found. Install <Alert.Link href="https://phantom.app/">Phantom Browser extension</Alert.Link>
          </Alert>
        </>
      )}
    </div>
  );
}

export default App;
