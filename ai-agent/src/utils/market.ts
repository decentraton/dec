export async function fetchSolPrice(): Promise<number> {
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data: any = await res.json();
    return data.solana.usd || 0;
  } catch (e) {
    console.error("[Market] Failed to fetch SOL price:", e);
    // Return a fallback price if API fails
    return 145.0; 
  }
}
