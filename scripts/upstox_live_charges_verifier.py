#!/usr/bin/env python3
"""
Upstox Live API Charges Verifier & Auditor

Connects to the official Upstox v2 API using credentials in `.env`,
queries the live `GET /v2/charges/brokerage` endpoint for both BUY and SELL legs
using real NSE F&O Option contracts, and performs an exact line-by-line audit.
"""

import os
import json
import urllib.request
import urllib.error
import urllib.parse
from typing import Dict, Any, Optional

ENV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")


def load_env_file(filepath: str) -> Dict[str, str]:
    """Parse .env file into key-value pairs without external dependencies."""
    env_vars = {}
    if not os.path.exists(filepath):
        return env_vars
    with open(filepath, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                k, v = line.split("=", 1)
                env_vars[k.strip()] = v.strip().strip('"').strip("'")
    return env_vars


def api_request(url: str, token: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Send an authenticated GET request to Upstox v2 API with valid browser headers."""
    if params:
        query_string = urllib.parse.urlencode(params)
        url = f"{url}?{query_string}"

    headers = {
        "Accept": "application/json",
        "Authorization": f"Bearer {token}",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    req = urllib.request.Request(url, headers=headers, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = resp.read().decode("utf-8")
            return json.loads(data)
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            err_json = json.loads(err_body)
            return {"status": "error", "http_code": e.code, "error": err_json}
        except Exception:
            return {"status": "error", "http_code": e.code, "message": err_body}
    except Exception as e:
        return {"status": "error", "message": str(e)}


def fetch_upstox_charges(token: str, instrument_token: str, quantity: int, product: str, transaction_type: str, price: float):
    """Call official Upstox v2 /charges/brokerage endpoint."""
    url = "https://api.upstox.com/v2/charges/brokerage"
    params = {
        "instrument_token": instrument_token,
        "quantity": quantity,
        "product": product,
        "transaction_type": transaction_type.upper(),
        "price": price
    }
    return api_request(url, token, params)


def audit_charges():
    env = load_env_file(ENV_PATH)
    api_key = env.get("UPSTOX_API_KEY", "")
    token = env.get("UPSTOX_ACCESS_TOKEN", "")

    print("\n" + "=" * 76)
    print("      UPSTOX OFFICIAL API CHARGES & REGULATORY TAX AUDITOR")
    print("=" * 76)

    if not token or token == "PASTE_YOUR_FULL_ACCESS_TOKEN_HERE":
        print("\n❌ ACCESS TOKEN MISSING OR NOT CONFIGURED IN .env")
        print(f"File location: {ENV_PATH}")
        print("Please check your .env file and run again.")
        print("=" * 76 + "\n")
        return

    # Step 1: Check user profile
    if api_key and api_key != "your_api_key_here":
        print(f"🔑 Active API Key: {api_key[:8]}...{api_key[-4:] if len(api_key) > 12 else ''}")
    print("⏳ Verifying token authentication with Upstox API...")
    profile_res = api_request("https://api.upstox.com/v2/user/profile", token)
    if profile_res.get("status") == "error":
        print(f"\n❌ Authentication Failed (HTTP {profile_res.get('http_code')}):")
        print(json.dumps(profile_res, indent=2))
        return

    user_name = profile_res.get("data", {}).get("user_name", "Valued Trader")
    user_id = profile_res.get("data", {}).get("user_id", "N/A")
    print(f"✅ Authenticated successfully as: {user_name} (Client ID: {user_id})")

    # Step 2: Trade Parameters (NIFTY Option 1 Lot = 65 Qty)
    qty = 65
    buy_price = 100.00
    sell_price = 102.35
    instrument_token = "NSE_FO|50978"  # Active NIFTY Option contract

    print(f"\n📊 Querying Official Upstox Charges API (/v2/charges/brokerage):")
    print(f"   Contract Token   : {instrument_token} (NIFTY Option)")
    print(f"   Quantity Traded  : {qty} units (1 Lot)")
    print(f"   Buy Entry Price  : ₹{buy_price:.2f} (Turnover: ₹{buy_price * qty:,.2f})")
    print(f"   Sell Exit Price  : ₹{sell_price:.2f} (Turnover: ₹{sell_price * qty:,.2f})")

    buy_resp = fetch_upstox_charges(token, instrument_token, qty, "D", "BUY", buy_price)
    sell_resp = fetch_upstox_charges(token, instrument_token, qty, "D", "SELL", sell_price)

    if buy_resp.get("status") == "error" or sell_resp.get("status") == "error":
        print("\n❌ API Error during query:")
        if buy_resp.get("status") == "error":
            print("Buy Query Error:", json.dumps(buy_resp, indent=2))
        if sell_resp.get("status") == "error":
            print("Sell Query Error:", json.dumps(sell_resp, indent=2))
        return

    b_charges = buy_resp.get("data", {}).get("charges", {})
    s_charges = sell_resp.get("data", {}).get("charges", {})

    b_taxes = b_charges.get("taxes", {})
    s_taxes = s_charges.get("taxes", {})

    b_other = b_charges.get("other_charges", {})
    s_other = s_charges.get("other_charges", {})

    # Extract Live API Values per leg
    buy_brok = float(b_charges.get("brokerage", 0.0))
    sell_brok = float(s_charges.get("brokerage", 0.0))
    total_brok = buy_brok + sell_brok

    buy_stt = float(b_taxes.get("stt", 0.0))
    sell_stt = float(s_taxes.get("stt", 0.0))
    total_stt = buy_stt + sell_stt

    buy_stamp = float(b_taxes.get("stamp_duty", 0.0))
    sell_stamp = float(s_taxes.get("stamp_duty", 0.0))
    total_stamp = buy_stamp + sell_stamp

    buy_txn = float(b_other.get("transaction", 0.0))
    sell_txn = float(s_other.get("transaction", 0.0))
    total_txn = buy_txn + sell_txn

    buy_sebi = float(b_other.get("sebi_turnover", 0.0))
    sell_sebi = float(s_other.get("sebi_turnover", 0.0))
    total_sebi = buy_sebi + sell_sebi

    buy_gst = float(b_taxes.get("gst", 0.0))
    sell_gst = float(s_taxes.get("gst", 0.0))
    total_gst = buy_gst + sell_gst

    buy_total = float(b_charges.get("total", 0.0))
    sell_total = float(s_charges.get("total", 0.0))
    grand_total = buy_total + sell_total

    # Display Breakdown Table
    print("\n" + "-" * 76)
    print(f"{'STATUTORY CHARGE':<26} | {'BUY LEG (₹)':<14} | {'SELL LEG (₹)':<14} | {'ROUNDTRIP (₹)':<14}")
    print("-" * 76)
    print(f"{'Brokerage':<26} | ₹{buy_brok:<12.2f} | ₹{sell_brok:<12.2f} | ₹{total_brok:<12.2f}")
    print(f"{'STT / CTT':<26} | ₹{buy_stt:<12.2f} | ₹{sell_stt:<12.2f} | ₹{total_stt:<12.2f}")
    print(f"{'Exchange Txn Fee':<26} | ₹{buy_txn:<12.2f} | ₹{sell_txn:<12.2f} | ₹{total_txn:<12.2f}")
    print(f"{'SEBI Turnover Fee':<26} | ₹{buy_sebi:<12.2f} | ₹{sell_sebi:<12.2f} | ₹{total_sebi:<12.2f}")
    print(f"{'Stamp Duty':<26} | ₹{buy_stamp:<12.2f} | ₹{sell_stamp:<12.2f} | ₹{total_stamp:<12.2f}")
    print(f"{'GST (18%)':<26} | ₹{buy_gst:<12.2f} | ₹{sell_gst:<12.2f} | ₹{total_gst:<12.2f}")
    print("-" * 76)
    print(f"{'TOTAL TAXES & CHARGES':<26} | ₹{buy_total:<12.2f} | ₹{sell_total:<12.2f} | ₹{grand_total:<12.2f}")
    print("-" * 76)

    # Effective Tax Rates Breakdown
    buy_turnover = buy_price * qty
    sell_turnover = sell_price * qty
    tot_turnover = buy_turnover + sell_turnover

    stt_rate = (sell_stt / sell_turnover * 100.0) if sell_turnover > 0 else 0.0
    txn_rate = (total_txn / tot_turnover * 100.0) if tot_turnover > 0 else 0.0
    stamp_rate = (buy_stamp / buy_turnover * 100.0) if buy_turnover > 0 else 0.0

    print("\n🔍 UPSTOX LIVE API APPLIED FORMULAS & RATES:")
    print(f"  • Brokerage Model   : ₹{buy_brok:.2f} Buy + ₹{sell_brok:.2f} Sell = ₹{total_brok:.2f} Flat Roundtrip")
    print(f"  • STT (Options)     : {stt_rate:.3f}% on Sell Turnover (₹{sell_stt:.2f} on ₹{sell_turnover:,.2f}) [Buy STT = ₹0.00]")
    print(f"  • Exchange Txn Fee  : {txn_rate:.4f}% on Total Turnover (NSE revised)")
    print(f"  • Stamp Duty        : {stamp_rate:.3f}% on Buy Turnover only (₹{buy_stamp:.2f})")
    print(f"  • GST (18%)         : 18% on (Brokerage ₹{total_brok:.2f} + Txn ₹{total_txn:.2f}) = ₹{total_gst:.2f}")
    print(f"  • Total Cost        : ₹{grand_total:.2f} ({grand_total / buy_turnover * 100.0:.2f}% of invested capital)")
    print("=" * 76 + "\n")


if __name__ == "__main__":
    audit_charges()
