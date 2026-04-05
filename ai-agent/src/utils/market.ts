let useCoinGecko = true;

export async function fetchSolPrice(): Promise<number> {
  useCoinGecko = !useCoinGecko;
  
  try {
    if (useCoinGecko) {
      const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd", { signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
      const data: any = await res.json();
      return data.solana.usd || 0;
    } else {
      const res = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT", { signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error(`Binance HTTP ${res.status}`);
      const data: any = await res.json();
      return parseFloat(data.price) || 0;
    }
  } catch (e) {
    console.warn(`[Market] Failed to fetch from ${useCoinGecko ? "CoinGecko" : "Binance"}, returning mock:`, e);
    // Return a fallback price if API fails
    return 145.0; 
  }
}
