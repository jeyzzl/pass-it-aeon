// utils/evmFaucet.js
const { ethers } = require('ethers');

// Monto fijo a enviar (ej. 0.001 ETH)
const AMOUNT_TO_SEND = ethers.parseEther("0.0001");

// Cargar las claves y URLs
const PRIVATE_KEY = process.env.FAUCET_PRIVATE_KEY_EVM;
const rpcUrls = {
  ethereum: process.env.ETH_RPC_URL,
  base: process.env.BASE_RPC_URL,
  bnb: process.env.BNB_RPC_URL,
};

async function sendEVMToken(claim) {
  try {
    const rpcUrl = rpcUrls[claim.blockchain];
    if (!rpcUrl) {
      throw new Error(`RPC URL no configurada para ${claim.blockchain}`);
    }

    // 1. Conectar al proveedor de la red
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // 2. Cargar nuestra billetera de faucet
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    // 3. Crear y enviar la transacción
    console.log(`[EVM] Enviando ${ethers.formatEther(AMOUNT_TO_SEND)} a ${claim.wallet_address} en ${claim.blockchain}...`);
    
    const tx = await wallet.sendTransaction({
      to: claim.wallet_address,
      value: AMOUNT_TO_SEND,
    });

    // 4. Esperar a que la transacción se confirme
    await tx.wait();

    console.log(`[EVM] ¡Éxito! Hash: ${tx.hash}`);
    return { success: true, txHash: tx.hash };

  } catch (err) {
    console.error(`[EVM] Error al procesar ${claim.id}:`, err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { sendEVMToken };