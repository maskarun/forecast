import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, Shield, ShieldAlert, ShieldCheck, 
  AlertTriangle, RefreshCw, Activity, DollarSign, PieChart, 
  CheckCircle, XCircle, Zap, Lock, Unlock, Search, Terminal, 
  ArrowUpRight, ArrowDownRight, Sliders, Layers, Play, Key, AlertCircle
} from 'lucide-react';

// Preset mock data database for rich stock evaluation
const PRESET_STOCKS = {
  NVDA: {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    price: 128.50,
    change: 3.42,
    sector: 'Semiconductors',
    moatScore: 92, // Strong CUDA ecosystem + AI hardware dominance
    roicVsWaccScore: 90, // ROIC ~45% vs WACC 9%
    growthScore: 88, // Exponential AI datacenter CAGR
    valuationScore: 65, // High multiples
    sentimentScore: 85, // Strong institutional momentum
    invalidationScore: 80, // Low immediate disruption risk
    scenarios: {
      bear: { val: 75.00, prob: 20 },
      base: { val: 145.00, prob: 60 },
      bull: { val: 195.00, prob: 20 }
    },
    technicals: {
      rsi: 62.4,
      dma50: 121.10,
      dma200: 98.40,
      shortInterest: '1.2%',
      insiderFlow: 'Net Selling (-$12M)'
    },
    invalidationTriggers: [
      'hyperscaler custom ASIC adoption exceeds 35% of total AI compute',
      'Data Center revenue growth deceleration below 15% YoY for 2 consecutive quarters',
      'Geopolitical export restrictions tightening to block >$10B in pipeline supply'
    ]
  },
  AAPL: {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: 224.20,
    change: -0.85,
    sector: 'Consumer Electronics',
    moatScore: 95, // Ecosystem lock-in & brand value
    roicVsWaccScore: 85, // High ROIC from services & HW
    growthScore: 60, // Mature iPhone upgrade cycles
    valuationScore: 70, // Fairly valued
    sentimentScore: 78, // Stable
    invalidationScore: 90, // Low churn risk
    scenarios: {
      bear: { val: 170.00, prob: 25 },
      base: { val: 235.00, prob: 55 },
      bull: { val: 280.00, prob: 20 }
    },
    technicals: {
      rsi: 54.1,
      dma50: 220.50,
      dma200: 195.20,
      shortInterest: '0.8%',
      insiderFlow: 'Neutral (-$2.5M)'
    },
    invalidationTriggers: [
      'Services ecosystem revenue growth turns negative due to antitrust regulation',
      'Hardware gross margins contract below 38% for two consecutive quarters',
      'AI Siri features fail to drive smartphone upgrade cycle renewal rate above 12%'
    ]
  },
  RELIANCE: {
    symbol: 'RELIANCE',
    name: 'Reliance Industries Ltd',
    price: 2980.50,
    change: 1.15,
    sector: 'Conglomerate (Energy/Telecom/Retail)',
    moatScore: 88, // Scale dominance in India Telecom & Retail
    roicVsWaccScore: 75, // Heavy capex moderates ROIC
    growthScore: 82, // Digital & Retail tailwinds
    valuationScore: 78, // Reasonable multiples
    sentimentScore: 80, // Strong domestic support
    invalidationScore: 82,
    scenarios: {
      bear: { val: 2300.00, prob: 20 },
      base: { val: 3250.00, prob: 60 },
      bull: { val: 3900.00, prob: 20 }
    },
    technicals: {
      rsi: 58.2,
      dma50: 2910.00,
      dma200: 2740.00,
      shortInterest: '1.5%',
      insiderFlow: 'Net Buying (Promoters)'
    },
    invalidationTriggers: [
      'Jio ARPU growth stalls below 5% post-tariff hikes',
      'Oil-to-Chemical (O2C) refining margins crack below historical $6/bbl threshold',
      'Net debt-to-EBITDA expands beyond 3.0x due to uncalibrated green energy capex'
    ]
  },
  INFY: {
    symbol: 'INFY',
    name: 'Infosys Limited',
    price: 1820.00,
    change: -1.45,
    sector: 'IT Services',
    moatScore: 78, // Enterprise client relationships
    roicVsWaccScore: 82, // Asset-light business model
    growthScore: 65, // Discretionary IT spending moderation
    valuationScore: 80, // Attractive yield & multiple
    sentimentScore: 70, // Mild recovery
    invalidationScore: 75,
    scenarios: {
      bear: { val: 1450.00, prob: 30 },
      base: { val: 1950.00, prob: 50 },
      bull: { val: 2300.00, prob: 20 }
    },
    technicals: {
      rsi: 48.9,
      dma50: 1840.00,
      dma200: 1680.00,
      shortInterest: '2.1%',
      insiderFlow: 'Neutral'
    },
    invalidationTriggers: [
      'Large deal TCV pipeline contracts >15% YoY in core US/EU markets',
      'Attrition spike >20% disrupting margin realization on fixed-price projects',
      'Generative AI automation compresses billable head-count pricing faster than volume offset'
    ]
  }
};

export default function App() {
  // --- Global State ---
  const [selectedSymbol, setSelectedSymbol] = useState('NVDA');
  const [inputSymbol, setInputSymbol] = useState('NVDA');
  const [activeTab, setActiveTab] = useState('analysis'); // 'analysis', 'breaker', 'execution'

  // --- Portfolio & Account State ---
  const [initialCapital] = useState(1000000); // $1,000,000 baseline
  const [peakCapital, setPeakCapital] = useState(1000000);
  const [currentCapital, setCurrentCapital] = useState(982500); // Intraday fluctuation
  const [holdingValue, setHoldingValue] = useState(145000); // Asset exposure in current symbol

  // --- Circuit Breaker State Engine ---
  // Status: ACTIVE (Normal operation), TRIPPED (Halted due to risk breach), OVERRIDE (Manually overridden by admin)
  const [breakerStatus, setBreakerStatus] = useState('ACTIVE');
  const [adminKey, setAdminKey] = useState('');
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminError, setAdminError] = useState('');

  // Risk parameters & live telemetry
  const [telemetry, setTelemetry] = useState({
    drawdownPct: 1.75,       // % from peak capital
    ordersLastMinute: 2,     // Limit: 5
    duplicatePayload: false, // Anti-loop detection
    assetConcentration: 14.5, // % of portfolio in this stock (Limit: 15%)
    apiLatencyMs: 340,       // Limit: 2000ms
  });

  // Circuit Breaker Event Audit Log
  const [breakerLogs, setBreakerLogs] = useState([
    { id: 1, time: '10:14:02', level: 'INFO', msg: 'System initialized. All risk checks passed.', state: 'ACTIVE' },
    { id: 2, time: '11:05:44', level: 'WARN', msg: 'Concentration for NVDA reached 14.5% (Cap: 15.0%).', state: 'ACTIVE' }
  ]);

  // Tab 1: Valuation Calculator State
  const [marginOfSafety, setMarginOfSafety] = useState(20); // 20% default

  // Tab 3: Order Engine State
  const [orderConfig, setOrderConfig] = useState({
    symbol: 'NVDA',
    orderType: 'LIMIT', // LIMIT, MARKET, STOP_LOSS
    action: 'BUY',      // BUY, SELL
    quantity: 100,
    customPrice: 128.50
  });

  const [orderAuditStatus, setOrderAuditStatus] = useState(null); // null, 'CHECKING', 'PASSED', 'FAILED'
  const [auditFailReasons, setAuditFailReasons] = useState([]);
  const [orderBook, setOrderBook] = useState([
    { id: 'ORD-9821', symbol: 'AAPL', action: 'BUY', qty: 50, price: 222.50, notional: 11125, status: 'EXECUTED', time: '09:45:12' },
    { id: 'ORD-9822', symbol: 'NVDA', action: 'BUY', qty: 200, price: 125.00, notional: 25000, status: 'EXECUTED', time: '10:12:30' }
  ]);

  // Current Active Stock Object
  const currentStock = useMemo(() => {
    return PRESET_STOCKS[selectedSymbol] || {
      symbol: selectedSymbol,
      name: `${selectedSymbol} Synthetic Asset`,
      price: 150.00,
      change: 0.50,
      sector: 'Technology & Hardware',
      moatScore: 70,
      roicVsWaccScore: 70,
      growthScore: 70,
      valuationScore: 70,
      sentimentScore: 70,
      invalidationScore: 70,
      scenarios: {
        bear: { val: 100.00, prob: 25 },
        base: { val: 160.00, prob: 50 },
        bull: { val: 210.00, prob: 25 }
      },
      technicals: {
        rsi: 52.0,
        dma50: 148.00,
        dma200: 135.00,
        shortInterest: '1.8%',
        insiderFlow: 'Neutral'
      },
      invalidationTriggers: [
        'Revenue trajectory declines >10% below consensus forecast',
        'Gross profit margin falls under 25% threshold',
        'Major regulatory constraint limits product distribution'
      ]
    };
  }, [selectedSymbol]);

  // Update order config symbol when selected symbol changes
  useEffect(() => {
    setOrderConfig(prev => ({
      ...prev,
      symbol: selectedSymbol,
      customPrice: currentStock.price
    }));
  }, [selectedSymbol, currentStock]);

  // Recalculate Drawdown and Asset Concentration when Portfolio / Stock values shift
  useEffect(() => {
    const drawdown = ((peakCapital - currentCapital) / peakCapital) * 100;
    const conc = (holdingValue / currentCapital) * 100;
    
    setTelemetry(prev => ({
      ...prev,
      drawdownPct: parseFloat(drawdown.toFixed(2)),
      assetConcentration: parseFloat(conc.toFixed(2))
    }));
  }, [currentCapital, peakCapital, holdingValue]);

  // --- Automatic Circuit Breaker Risk Evaluation Middleware Engine ---
  useEffect(() => {
    // If breaker is manually overridden, we don't automatically trip
    if (breakerStatus === 'OVERRIDE') return;

    const breaches = [];
    if (telemetry.drawdownPct >= 2.0) {
      breaches.push(`Drawdown breach: ${telemetry.drawdownPct}% >= Max 2.0% limit`);
    }
    if (telemetry.ordersLastMinute > 5) {
      breaches.push(`Velocity breach: ${telemetry.ordersLastMinute} orders/min > Max 5 limit`);
    }
    if (telemetry.duplicatePayload) {
      breaches.push(`Anti-loop payload anomaly: Duplicate signature detected in window`);
    }
    if (telemetry.assetConcentration > 15.0) {
      breaches.push(`Concentration breach: ${telemetry.assetConcentration}% > Max 15.0% limit`);
    }
    if (telemetry.apiLatencyMs >= 2000) {
      breaches.push(`Latency staleness breach: ${telemetry.apiLatencyMs}ms >= Max 2000ms threshold`);
    }

    if (breaches.length > 0 && breakerStatus !== 'TRIPPED') {
      setBreakerStatus('TRIPPED');
      const logEntry = {
        id: Date.now(),
        time: new Date().toLocaleTimeString(),
        level: 'CRITICAL',
        msg: `CIRCUIT BREAKER TRIPPED! Violations: ${breaches.join(' | ')}`,
        state: 'TRIPPED'
      };
      setBreakerLogs(prev => [logEntry, ...prev]);
    }
  }, [telemetry, breakerStatus]);

  // Weighted Composite Fundamental Analysis Score (Out of 100)
  const compositeScore = useMemo(() => {
    const weights = {
      moat: 0.25,
      roic: 0.20,
      growth: 0.20,
      valuation: 0.15,
      sentiment: 0.10,
      invalidation: 0.10
    };
    
    const score = (
      currentStock.moatScore * weights.moat +
      currentStock.roicVsWaccScore * weights.roic +
      currentStock.growthScore * weights.growth +
      currentStock.valuationScore * weights.valuation +
      currentStock.sentimentScore * weights.sentiment +
      currentStock.invalidationScore * weights.invalidation
    );

    return Math.round(score);
  }, [currentStock]);

  // Composite Rating Determination
  const compositeRating = useMemo(() => {
    if (compositeScore >= 80) return { label: 'BUY / ACCUMULATE', color: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40' };
    if (compositeScore >= 65) return { label: 'WATCHLIST / HOLD', color: 'text-yellow-400 bg-yellow-950/60 border-yellow-500/40' };
    return { label: 'IGNORE / AVOID', color: 'text-rose-400 bg-rose-950/60 border-rose-500/40' };
  }, [compositeScore]);

  // Probability-Weighted Fair Value (EV)
  const netExpectedValue = useMemo(() => {
    const { bear, base, bull } = currentStock.scenarios;
    const ev = (bear.val * (bear.prob / 100)) + (base.val * (base.prob / 100)) + (bull.val * (bull.prob / 100));
    return parseFloat(ev.toFixed(2));
  }, [currentStock]);

  // Buy Price with Margin of Safety
  const maxEntryPrice = useMemo(() => {
    return parseFloat((netExpectedValue * (1 - marginOfSafety / 100)).toFixed(2));
  }, [netExpectedValue, marginOfSafety]);

  const upsidePct = useMemo(() => {
    return parseFloat((((netExpectedValue - currentStock.price) / currentStock.price) * 100).toFixed(2));
  }, [netExpectedValue, currentStock.price]);

  const downsidePct = useMemo(() => {
    return parseFloat((((currentStock.price - currentStock.scenarios.bear.val) / currentStock.price) * 100).toFixed(2));
  }, [currentStock]);

  const riskRewardRatio = useMemo(() => {
    if (downsidePct <= 0) return 'N/A';
    return (upsidePct / downsidePct).toFixed(2);
  }, [upsidePct, downsidePct]);

  // Handlers for Stock Selection
  const handleSymbolSubmit = (e) => {
    e.preventDefault();
    if (inputSymbol.trim()) {
      setSelectedSymbol(inputSymbol.trim().toUpperCase());
    }
  };

  const handleSelectPreset = (sym) => {
    setInputSymbol(sym);
    setSelectedSymbol(sym);
  };

  // Breaker Simulation Actions
  const simulateDrawdownBreach = () => {
    setCurrentCapital(975000); // 2.5% drawdown from $1,000,000 peak
    logSimulation('Simulated Intraday Drawdown breach (> 2.0%)');
  };

  const simulateVelocityBreach = () => {
    setTelemetry(prev => ({ ...prev, ordersLastMinute: 8 }));
    logSimulation('Simulated Rapid Order Velocity loop (> 5 orders/min)');
  };

  const simulateDuplicatePayload = () => {
    setTelemetry(prev => ({ ...prev, duplicatePayload: true }));
    logSimulation('Simulated Duplicate payload signature in rapid succession');
  };

  const simulateConcentrationBreach = () => {
    setHoldingValue(170000); // ~17.3% concentration
    logSimulation('Simulated Concentration cap overflow (> 15%)');
  };

  const simulateLatencySpike = () => {
    setTelemetry(prev => ({ ...prev, apiLatencyMs: 2850 }));
    logSimulation('Simulated Stale API gateway response latency (> 2000ms)');
  };

  const resetTelemetryToNormal = () => {
    setCurrentCapital(985000);
    setHoldingValue(140000);
    setTelemetry({
      drawdownPct: 1.5,
      ordersLastMinute: 1,
      duplicatePayload: false,
      assetConcentration: 14.2,
      apiLatencyMs: 240,
    });
    logSimulation('Reset all telemetry indicators to normal limits');
  };

  const logSimulation = (desc) => {
    setBreakerLogs(prev => [
      { id: Date.now(), time: new Date().toLocaleTimeString(), level: 'SIMULATION', msg: desc, state: breakerStatus },
      ...prev
    ]);
  };

  // Emergency Admin Override / Reset
  const handleAdminResetSubmit = (e) => {
    e.preventDefault();
    if (adminKey === 'AUTHORIZED_ADMIN_KEY') {
      setBreakerStatus('ACTIVE');
      resetTelemetryToNormal();
      setShowAdminModal(false);
      setAdminKey('');
      setAdminError('');
      setBreakerLogs(prev => [
        { id: Date.now(), time: new Date().toLocaleTimeString(), level: 'OVERRIDE', msg: 'System manually UNLOCKED by Admin authorization key.', state: 'ACTIVE' },
        ...prev
      ]);
    } else {
      setAdminError('Invalid Security Key! Use: AUTHORIZED_ADMIN_KEY');
    }
  };

  // Pre-Execution Synchronous Audit Check
  const runPreExecutionCheck = () => {
    setOrderAuditStatus('CHECKING');
    setAuditFailReasons([]);

    setTimeout(() => {
      const failures = [];

      if (breakerStatus === 'TRIPPED') {
        failures.push('Agentic Circuit Breaker is TRIPPED. All automated order routing disabled.');
      }
      if (telemetry.drawdownPct >= 2.0) {
        failures.push(`Drawdown limit violated (${telemetry.drawdownPct}% >= 2.0%)`);
      }
      if (telemetry.ordersLastMinute >= 5) {
        failures.push(`Rate limit breached (${telemetry.ordersLastMinute} orders/min)`);
      }
      if (telemetry.duplicatePayload) {
        failures.push('Duplicate payload loop flag enabled.');
      }
      if (telemetry.apiLatencyMs >= 2000) {
        failures.push(`API Latency staled (${telemetry.apiLatencyMs}ms)`);
      }

      // Check if order would exceed concentration
      const calculatedNotional = orderConfig.quantity * orderConfig.customPrice;
      const futureHolding = holdingValue + (orderConfig.action === 'BUY' ? calculatedNotional : -calculatedNotional);
      const futureConc = (futureHolding / currentCapital) * 100;
      if (futureConc > 15.0 && orderConfig.action === 'BUY') {
        failures.push(`Order would increase concentration to ${futureConc.toFixed(1)}% (Limit: 15%)`);
      }

      if (failures.length === 0) {
        setOrderAuditStatus('PASSED');
      } else {
        setOrderAuditStatus('FAILED');
        setAuditFailReasons(failures);
      }
    }, 600);
  };

  // Place Order Execution
  const handleExecuteOrder = () => {
    if (orderAuditStatus !== 'PASSED') return;

    const calculatedNotional = orderConfig.quantity * orderConfig.customPrice;
    const newOrder = {
      id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      symbol: orderConfig.symbol,
      action: orderConfig.action,
      qty: orderConfig.quantity,
      price: orderConfig.customPrice,
      notional: calculatedNotional,
      status: 'EXECUTED',
      time: new Date().toLocaleTimeString()
    };

    setOrderBook(prev => [newOrder, ...prev]);

    // Adjust portfolio holdings
    if (orderConfig.action === 'BUY') {
      setHoldingValue(prev => prev + calculatedNotional);
    } else {
      setHoldingValue(prev => Math.max(0, prev - calculatedNotional));
    }

    // Increment orders counter
    setTelemetry(prev => ({ ...prev, ordersLastMinute: prev.ordersLastMinute + 1 }));

    // Reset audit state
    setOrderAuditStatus(null);
    setBreakerLogs(prev => [
      { id: Date.now(), time: new Date().toLocaleTimeString(), level: 'INFO', msg: `Order ${newOrder.id} EXECUTED successfully: ${orderConfig.action} ${orderConfig.quantity} ${orderConfig.symbol} @ $${orderConfig.customPrice}`, state: breakerStatus },
      ...prev
    ]);
  };

  const cumulativePnL = currentCapital - initialCapital;

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans antialiased selection:bg-sky-500 selection:text-white p-2 md:p-6 space-y-5">
      
      {/* HEADER BAR & SYMBOL SEARCH */}
      <header className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-2xl backdrop-blur-md flex flex-col lg:flex-row items-center justify-between gap-4">
        
        {/* Logo & Ticker Search */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-tr from-sky-500 to-indigo-600 rounded-lg shadow-lg shadow-sky-500/20">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-wide bg-gradient-to-r from-sky-400 via-indigo-300 to-white bg-clip-text text-transparent">
                QUANT-AGENTIX TERMINAL
              </h1>
              <p className="text-xs text-slate-400 font-mono">INSTITUTIONAL RISK & VALUATION CIRCUIT</p>
            </div>
          </div>

          {/* Symbol Input Form */}
          <form onSubmit={handleSymbolSubmit} className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-48">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={inputSymbol}
                onChange={(e) => setInputSymbol(e.target.value.toUpperCase())}
                placeholder="ENTER TICKER..."
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg pl-9 pr-3 py-1.5 text-sm font-mono font-semibold text-slate-100 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all placeholder:text-slate-600 uppercase"
              />
            </div>
            <button
              type="submit"
              className="bg-sky-600 hover:bg-sky-500 text-white font-medium px-3 py-1.5 rounded-lg text-xs tracking-wider transition-colors shadow-lg shadow-sky-600/20"
            >
              LOAD
            </button>
          </form>

          {/* Quick Presets */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-950/50 p-1 rounded-lg border border-slate-800 text-xs font-mono">
            <span className="text-slate-500 px-1">PRESETS:</span>
            {Object.keys(PRESET_STOCKS).map((sym) => (
              <button
                key={sym}
                onClick={() => handleSelectPreset(sym)}
                className={`px-2 py-1 rounded transition-all ${
                  selectedSymbol === sym 
                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30 font-bold' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {sym}
              </button>
            ))}
          </div>
        </div>

        {/* Live Breaker State & Portfolio Telemetry Ribbon */}
        <div className="flex flex-wrap items-center justify-end gap-3 w-full lg:w-auto text-xs font-mono">
          
          {/* Circuit Breaker Status Badge */}
          <div className="flex items-center gap-2 bg-slate-950/90 border border-slate-800 rounded-lg px-3 py-2">
            <span className="text-slate-400 font-sans text-[11px] uppercase tracking-wider">BREAKER:</span>
            {breakerStatus === 'ACTIVE' && (
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded-md animate-pulse">
                <ShieldCheck className="w-3.5 h-3.5" /> ACTIVE
              </span>
            )}
            {breakerStatus === 'TRIPPED' && (
              <span className="flex items-center gap-1.5 text-rose-400 font-bold bg-rose-950/80 border border-rose-500/40 px-2 py-0.5 rounded-md animate-bounce">
                <ShieldAlert className="w-3.5 h-3.5" /> TRIPPED
              </span>
            )}
            {breakerStatus === 'OVERRIDE' && (
              <span className="flex items-center gap-1.5 text-amber-400 font-bold bg-amber-950/80 border border-amber-500/40 px-2 py-0.5 rounded-md">
                <AlertTriangle className="w-3.5 h-3.5" /> OVERRIDE
              </span>
            )}
          </div>

          {/* Intraday Drawdown */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-1.5">
            <div className="text-slate-500 text-[10px]">INTRADAY DRAWDOWN</div>
            <div className={`font-semibold ${telemetry.drawdownPct >= 2.0 ? 'text-rose-400 font-bold' : 'text-slate-200'}`}>
              {telemetry.drawdownPct}% / <span className="text-slate-500">2.0%</span>
            </div>
          </div>

          {/* Capital & Cumulative PnL */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-1.5">
            <div className="text-slate-500 text-[10px]">PORTFOLIO NAV / PnL</div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-100">${currentCapital.toLocaleString()}</span>
              <span className={`flex items-center font-bold ${cumulativePnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {cumulativePnL >= 0 ? '+' : ''}${cumulativePnL.toLocaleString()}
              </span>
            </div>
          </div>

        </div>
      </header>

      {/* SYMBOL SUMMARY BANNER */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center min-w-[80px]">
            <span className="text-xs text-slate-500 font-mono block">TICKER</span>
            <span className="text-xl font-extrabold font-mono text-sky-400">{currentStock.symbol}</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">{currentStock.name}</h2>
            <p className="text-xs text-slate-400 font-mono">{currentStock.sector} • Institutional Rating Matrix</p>
          </div>
        </div>

        <div className="flex items-center gap-6 font-mono">
          <div>
            <div className="text-xs text-slate-500">LAST PRICE</div>
            <div className="text-2xl font-bold text-slate-100">${currentStock.price.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">24H CHANGE</div>
            <div className={`text-base font-bold flex items-center ${currentStock.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {currentStock.change >= 0 ? <ArrowUpRight className="w-4 h-4 mr-0.5" /> : <ArrowDownRight className="w-4 h-4 mr-0.5" />}
              {currentStock.change >= 0 ? '+' : ''}{currentStock.change}%
            </div>
          </div>
          <div className="border-l border-slate-800 pl-4">
            <div className="text-xs text-slate-500">COMPOSITE SCORE</div>
            <div className="text-2xl font-black text-sky-400">{compositeScore}<span className="text-xs text-slate-500">/100</span></div>
          </div>
          <div className={`px-3 py-1.5 rounded-lg border text-xs font-bold font-sans tracking-wide ${compositeRating.color}`}>
            {compositeRating.label}
          </div>
        </div>
      </div>

      {/* TAB NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 font-mono text-xs">
        <button
          onClick={() => setActiveTab('analysis')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
            activeTab === 'analysis'
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-lg shadow-sky-500/10'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <PieChart className="w-4 h-4" />
          1. RESEARCH & VALUATION FRAMEWORK
        </button>

        <button
          onClick={() => setActiveTab('breaker')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all relative ${
            activeTab === 'breaker'
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-lg shadow-sky-500/10'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <Shield className="w-4 h-4" />
          2. AGENTIC RISK CIRCUIT BREAKER
          {breakerStatus === 'TRIPPED' && (
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping absolute top-2 right-2" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('execution')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
            activeTab === 'execution'
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-lg shadow-sky-500/10'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <Zap className="w-4 h-4" />
          3. ORDER EXECUTION ENGINE
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: STOCK INVESTMENT ANALYSIS SKILL FRAMEWORK                         */}
      {/* ========================================================================= */}
      {activeTab === 'analysis' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          
          {/* LEFT 2 COLUMNS: SCORING TABLE & SCENARIOS */}
          <div className="lg:col-span-2 space-y-5">
            
            {/* Fundamental Scoring Matrix */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-200 font-mono flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-sky-400" />
                  INSTITUTIONAL MULTI-FACTOR SCORECARD (STOCK-INVESTMENT-ANALYSIS)
                </h3>
                <span className="text-xs text-slate-500 font-mono">Weighted Total: {compositeScore}/100</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono text-left border-collapse">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-800 bg-slate-950/40">
                      <th className="py-2.5 px-3">FACTOR / PILLAR</th>
                      <th className="py-2.5 px-3">WEIGHT</th>
                      <th className="py-2.5 px-3">SCORE</th>
                      <th className="py-2.5 px-3">EVALUATION METRIC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    <tr>
                      <td className="py-3 px-3 font-semibold text-slate-200">Economic Moats & Pricing Power</td>
                      <td className="py-3 px-3 text-slate-400">25%</td>
                      <td className="py-3 px-3">
                        <span className="text-emerald-400 font-bold">{currentStock.moatScore}</span>/100
                      </td>
                      <td className="py-3 px-3 text-slate-400">High switching costs, ecosystem network effect</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-semibold text-slate-200">ROIC vs. WACC Spread</td>
                      <td className="py-3 px-3 text-slate-400">20%</td>
                      <td className="py-3 px-3">
                        <span className="text-emerald-400 font-bold">{currentStock.roicVsWaccScore}</span>/100
                      </td>
                      <td className="py-3 px-3 text-slate-400">ROIC exceeds capital cost by &gt; 15% delta</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-semibold text-slate-200">Sustainable Revenue Growth</td>
                      <td className="py-3 px-3 text-slate-400">20%</td>
                      <td className="py-3 px-3">
                        <span className="text-sky-400 font-bold">{currentStock.growthScore}</span>/100
                      </td>
                      <td className="py-3 px-3 text-slate-400">Structural secular tailwinds & TAM expansion</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-semibold text-slate-200">Probabilistic DCF Valuation</td>
                      <td className="py-3 px-3 text-slate-400">15%</td>
                      <td className="py-3 px-3">
                        <span className="text-amber-400 font-bold">{currentStock.valuationScore}</span>/100
                      </td>
                      <td className="py-3 px-3 text-slate-400">Margin of safety relative to base intrinsic value</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-semibold text-slate-200">Institutional Sentiment & Catalysts</td>
                      <td className="py-3 px-3 text-slate-400">10%</td>
                      <td className="py-3 px-3">
                        <span className="text-sky-400 font-bold">{currentStock.sentimentScore}</span>/100
                      </td>
                      <td className="py-3 px-3 text-slate-400">13F institutional accumulation & analyst consensus</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-semibold text-slate-200">Thesis Invalidation Robustness</td>
                      <td className="py-3 px-3 text-slate-400">10%</td>
                      <td className="py-3 px-3">
                        <span className="text-emerald-400 font-bold">{currentStock.invalidationScore}</span>/100
                      </td>
                      <td className="py-3 px-3 text-slate-400">Low vulnerability to single-point-of-failure risks</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Probability-Weighted Fair Value Table */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-200 font-mono flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-indigo-400" />
                  PROBABILITY-WEIGHTED FAIR VALUE MODEL (DCF / MULTIPLES)
                </h3>
                <span className="text-xs font-mono text-sky-400 font-semibold">
                  EXPECTED VALUE: ${netExpectedValue.toFixed(2)}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono">
                {/* Bear Case */}
                <div className="bg-rose-950/20 border border-rose-900/40 rounded-lg p-3.5 space-y-1.5">
                  <div className="flex justify-between items-center text-rose-400 text-xs font-bold">
                    <span>BEAR CASE</span>
                    <span>{currentStock.scenarios.bear.prob}% PROB</span>
                  </div>
                  <div className="text-xl font-bold text-slate-100">${currentStock.scenarios.bear.val.toFixed(2)}</div>
                  <p className="text-[11px] text-slate-400">Downside multiple contraction or macro headwind scenario.</p>
                </div>

                {/* Base Case */}
                <div className="bg-slate-950/60 border border-sky-500/30 rounded-lg p-3.5 space-y-1.5">
                  <div className="flex justify-between items-center text-sky-400 text-xs font-bold">
                    <span>BASE CASE</span>
                    <span>{currentStock.scenarios.base.prob}% PROB</span>
                  </div>
                  <div className="text-xl font-bold text-slate-100">${currentStock.scenarios.base.val.toFixed(2)}</div>
                  <p className="text-[11px] text-slate-400">Consensus guidance, normalized growth & margin retention.</p>
                </div>

                {/* Bull Case */}
                <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-lg p-3.5 space-y-1.5">
                  <div className="flex justify-between items-center text-emerald-400 text-xs font-bold">
                    <span>BULL CASE</span>
                    <span>{currentStock.scenarios.bull.prob}% PROB</span>
                  </div>
                  <div className="text-xl font-bold text-slate-100">${currentStock.scenarios.bull.val.toFixed(2)}</div>
                  <p className="text-[11px] text-slate-400">Market share acceleration and margin expansion upside.</p>
                </div>
              </div>
            </div>

            {/* Thesis Invalidation Monitoring Panel */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
              <h3 className="text-sm font-bold text-slate-200 font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                THESIS INVALIDATION TRIGGERS (KILL SWITCH CRITERIA)
              </h3>
              <p className="text-xs text-slate-400">
                If any of the following qualitative or quantitative conditions manifest, the investment thesis is broken and position liquidation is enforced:
              </p>

              <div className="space-y-2 font-mono text-xs">
                {currentStock.invalidationTriggers.map((trigger, idx) => (
                  <div key={idx} className="flex items-start gap-2 bg-slate-950/70 border border-slate-800 p-2.5 rounded-lg text-slate-300">
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span><strong className="text-slate-200">Trigger {idx + 1}:</strong> {trigger}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: BUY-PRICE CALCULATOR & TECHNICALS */}
          <div className="space-y-5">
            
            {/* Margin of Safety & Buy Price Calculator */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-slate-200 font-mono flex items-center gap-2">
                <Sliders className="w-4 h-4 text-sky-400" />
                BUY-PRICE CALCULATOR
              </h3>

              {/* Slider for Margin of Safety */}
              <div className="space-y-2 font-mono">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">MARGIN OF SAFETY:</span>
                  <span className="text-sky-400 font-bold">{marginOfSafety}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="40"
                  step="1"
                  value={marginOfSafety}
                  onChange={(e) => setMarginOfSafety(Number(e.target.value))}
                  className="w-full accent-sky-500 bg-slate-950 h-2 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>5% (Aggressive)</span>
                  <span>20% (Standard)</span>
                  <span>40% (Conservative)</span>
                </div>
              </div>

              {/* Calculated Outputs */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3.5 space-y-3 font-mono text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">EXPECTED FAIR VALUE:</span>
                  <span className="font-bold text-slate-200">${netExpectedValue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-800 pt-2">
                  <span className="text-slate-300 font-semibold">MAX ENTRY BUY PRICE:</span>
                  <span className="text-base font-extrabold text-emerald-400">${maxEntryPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">CURRENT MARKET PRICE:</span>
                  <span className={`font-bold ${currentStock.price <= maxEntryPrice ? 'text-emerald-400' : 'text-amber-400'}`}>
                    ${currentStock.price.toFixed(2)}
                  </span>
                </div>
                <div className="border-t border-slate-800 pt-2 grid grid-cols-2 gap-2 text-center">
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">
                    <div className="text-[10px] text-slate-500">EXPECTED UPSIDE</div>
                    <div className={`font-bold text-sm ${upsidePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {upsidePct >= 0 ? '+' : ''}{upsidePct}%
                    </div>
                  </div>
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">
                    <div className="text-[10px] text-slate-500">RISK / REWARD</div>
                    <div className="font-bold text-sm text-sky-400">{riskRewardRatio}x</div>
                  </div>
                </div>
              </div>

              {/* Price Entry Recommendation */}
              <div className="text-xs font-mono p-2.5 rounded-lg border text-center">
                {currentStock.price <= maxEntryPrice ? (
                  <div className="bg-emerald-950/30 text-emerald-400 border-emerald-500/30 font-bold">
                    ✓ CURRENT PRICE IS WITHIN MARGIN OF SAFETY ENTRY ZONE
                  </div>
                ) : (
                  <div className="bg-amber-950/30 text-amber-400 border-amber-500/30 font-semibold">
                    ⚠ CURRENT PRICE EXCEEDS TARGET BUY PRICE (${maxEntryPrice.toFixed(2)})
                  </div>
                )}
              </div>
            </div>

            {/* Technicals & Sentiment Metric Grid */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
              <h3 className="text-sm font-bold text-slate-200 font-mono flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                TECHNICAL & SENTIMENT SIGNALS
              </h3>

              <div className="space-y-2.5 font-mono text-xs">
                <div className="flex justify-between items-center bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400">RSI (14-DAY):</span>
                  <span className={`font-bold ${currentStock.technicals.rsi > 70 ? 'text-rose-400' : currentStock.technicals.rsi < 30 ? 'text-emerald-400' : 'text-slate-200'}`}>
                    {currentStock.technicals.rsi} {currentStock.technicals.rsi > 70 ? '(Overbought)' : currentStock.technicals.rsi < 30 ? '(Oversold)' : '(Neutral)'}
                  </span>
                </div>

                <div className="flex justify-between items-center bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400">50-DMA / 200-DMA:</span>
                  <span className="font-bold text-slate-200">
                    ${currentStock.technicals.dma50.toFixed(2)} / ${currentStock.technicals.dma200.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-center bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400">SHORT INTEREST (% FLOAT):</span>
                  <span className="font-bold text-sky-400">{currentStock.technicals.shortInterest}</span>
                </div>

                <div className="flex justify-between items-center bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400">INSIDER TRANSACTION FLOW:</span>
                  <span className="font-bold text-slate-200">{currentStock.technicals.insiderFlow}</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: AGENTIC SAFETY CIRCUIT BREAKER MIDDLEWARE SKILL                    */}
      {/* ========================================================================= */}
      {activeTab === 'breaker' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          
          {/* LEFT 2 COLUMNS: REAL-TIME CHECKS & BREAKER SIMULATOR */}
          <div className="lg:col-span-2 space-y-5">
            
            {/* Real-time Risk Telemetry Check Panel */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-200 font-mono flex items-center gap-2">
                  <Shield className="w-4 h-4 text-sky-400" />
                  REAL-TIME PRE-TRADE RISK EVALUATION CHECKS
                </h3>
                <span className="text-xs text-slate-500 font-mono">Agentic Middleware v2.4</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
                
                {/* Check 1: Intraday Drawdown */}
                <div className={`p-3.5 rounded-lg border transition-all ${
                  telemetry.drawdownPct >= 2.0 
                    ? 'bg-rose-950/30 border-rose-500/60 text-rose-300' 
                    : 'bg-slate-950/60 border-slate-800 text-slate-300'
                }`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-slate-200">1. MAX INTRADAY DRAWDOWN</span>
                    {telemetry.drawdownPct >= 2.0 ? (
                      <span className="text-rose-400 flex items-center gap-1 font-bold"><XCircle className="w-3.5 h-3.5" /> FAILED</span>
                    ) : (
                      <span className="text-emerald-400 flex items-center gap-1 font-bold"><CheckCircle className="w-3.5 h-3.5" /> PASS</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mb-2">Threshold limit: 2.0% max loss from daily peak capital.</p>
                  <div className="flex justify-between font-bold">
                    <span>Current Drawdown:</span>
                    <span className={telemetry.drawdownPct >= 2.0 ? 'text-rose-400' : 'text-emerald-400'}>
                      {telemetry.drawdownPct}%
                    </span>
                  </div>
                </div>

                {/* Check 2: Rate Limit / Velocity */}
                <div className={`p-3.5 rounded-lg border transition-all ${
                  telemetry.ordersLastMinute > 5 
                    ? 'bg-rose-950/30 border-rose-500/60 text-rose-300' 
                    : 'bg-slate-950/60 border-slate-800 text-slate-300'
                }`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-slate-200">2. ORDER VELOCITY RATE LIMIT</span>
                    {telemetry.ordersLastMinute > 5 ? (
                      <span className="text-rose-400 flex items-center gap-1 font-bold"><XCircle className="w-3.5 h-3.5" /> FAILED</span>
                    ) : (
                      <span className="text-emerald-400 flex items-center gap-1 font-bold"><CheckCircle className="w-3.5 h-3.5" /> PASS</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mb-2">Threshold limit: Max 5 orders per rolling minute.</p>
                  <div className="flex justify-between font-bold">
                    <span>Orders (Last Min):</span>
                    <span className={telemetry.ordersLastMinute > 5 ? 'text-rose-400' : 'text-emerald-400'}>
                      {telemetry.ordersLastMinute} / 5
                    </span>
                  </div>
                </div>

                {/* Check 3: Duplicate Payload Anti-Loop */}
                <div className={`p-3.5 rounded-lg border transition-all ${
                  telemetry.duplicatePayload 
                    ? 'bg-rose-950/30 border-rose-500/60 text-rose-300' 
                    : 'bg-slate-950/60 border-slate-800 text-slate-300'
                }`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-slate-200">3. ANTI-LOOP DUPLICATE PAYLOAD</span>
                    {telemetry.duplicatePayload ? (
                      <span className="text-rose-400 flex items-center gap-1 font-bold"><XCircle className="w-3.5 h-3.5" /> DETECTED</span>
                    ) : (
                      <span className="text-emerald-400 flex items-center gap-1 font-bold"><CheckCircle className="w-3.5 h-3.5" /> CLEAR</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mb-2">Prevents algorithmic endless submission loops.</p>
                  <div className="flex justify-between font-bold">
                    <span>Payload Signature:</span>
                    <span className={telemetry.duplicatePayload ? 'text-rose-400' : 'text-emerald-400'}>
                      {telemetry.duplicatePayload ? 'ANOMALY (MATCH)' : 'UNIQUE'}
                    </span>
                  </div>
                </div>

                {/* Check 4: Asset Concentration */}
                <div className={`p-3.5 rounded-lg border transition-all ${
                  telemetry.assetConcentration > 15.0 
                    ? 'bg-rose-950/30 border-rose-500/60 text-rose-300' 
                    : 'bg-slate-950/60 border-slate-800 text-slate-300'
                }`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-slate-200">4. ASSET CONCENTRATION CAP</span>
                    {telemetry.assetConcentration > 15.0 ? (
                      <span className="text-rose-400 flex items-center gap-1 font-bold"><XCircle className="w-3.5 h-3.5" /> BREACHED</span>
                    ) : (
                      <span className="text-emerald-400 flex items-center gap-1 font-bold"><CheckCircle className="w-3.5 h-3.5" /> PASS</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mb-2">Threshold limit: Max 15% allocation per single stock.</p>
                  <div className="flex justify-between font-bold">
                    <span>{selectedSymbol} Exposure:</span>
                    <span className={telemetry.assetConcentration > 15.0 ? 'text-rose-400' : 'text-emerald-400'}>
                      {telemetry.assetConcentration}%
                    </span>
                  </div>
                </div>

                {/* Check 5: API Latency / Staleness */}
                <div className={`p-3.5 rounded-lg border transition-all md:col-span-2 ${
                  telemetry.apiLatencyMs >= 2000 
                    ? 'bg-rose-950/30 border-rose-500/60 text-rose-300' 
                    : 'bg-slate-950/60 border-slate-800 text-slate-300'
                }`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-slate-200">5. API GATEWAY LATENCY & STALENESS</span>
                    {telemetry.apiLatencyMs >= 2000 ? (
                      <span className="text-rose-400 flex items-center gap-1 font-bold"><XCircle className="w-3.5 h-3.5" /> STALE DATA</span>
                    ) : (
                      <span className="text-emerald-400 flex items-center gap-1 font-bold"><CheckCircle className="w-3.5 h-3.5" /> OPTIMAL</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mb-2">Threshold limit: Must receive exchange tick feeds under 2000ms latency.</p>
                  <div className="flex justify-between font-bold">
                    <span>Gateway Ping:</span>
                    <span className={telemetry.apiLatencyMs >= 2000 ? 'text-rose-400' : 'text-emerald-400'}>
                      {telemetry.apiLatencyMs} ms
                    </span>
                  </div>
                </div>

              </div>
            </div>

            {/* Interactive Breaker Stress Test Simulator */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-slate-200 font-mono flex items-center gap-2">
                <Play className="w-4 h-4 text-amber-400" />
                INTERACTIVE BREAKER FAULT SIMULATOR
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Trigger simulated anomalies to test the agentic circuit breaker middleware's automated protection system.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 font-mono text-xs">
                <button
                  onClick={simulateDrawdownBreach}
                  className="bg-slate-950 border border-rose-500/40 hover:bg-rose-950/40 text-rose-300 p-2.5 rounded-lg text-left transition-all"
                >
                  <div className="font-bold">⚡ DRAWDOWN &gt; 2%</div>
                  <div className="text-[10px] text-slate-500">Drop capital to $975,000</div>
                </button>

                <button
                  onClick={simulateVelocityBreach}
                  className="bg-slate-950 border border-rose-500/40 hover:bg-rose-950/40 text-rose-300 p-2.5 rounded-lg text-left transition-all"
                >
                  <div className="font-bold">⚡ VELOCITY LOOP</div>
                  <div className="text-[10px] text-slate-500">Spike orders to 8/min</div>
                </button>

                <button
                  onClick={simulateDuplicatePayload}
                  className="bg-slate-950 border border-rose-500/40 hover:bg-rose-950/40 text-rose-300 p-2.5 rounded-lg text-left transition-all"
                >
                  <div className="font-bold">⚡ DUPLICATE PAYLOAD</div>
                  <div className="text-[10px] text-slate-500">Trigger anti-loop flag</div>
                </button>

                <button
                  onClick={simulateConcentrationBreach}
                  className="bg-slate-950 border border-rose-500/40 hover:bg-rose-950/40 text-rose-300 p-2.5 rounded-lg text-left transition-all"
                >
                  <div className="font-bold">⚡ OVER-CONCENTRATION</div>
                  <div className="text-[10px] text-slate-500">Push allocation to 17.3%</div>
                </button>

                <button
                  onClick={simulateLatencySpike}
                  className="bg-slate-950 border border-rose-500/40 hover:bg-rose-950/40 text-rose-300 p-2.5 rounded-lg text-left transition-all"
                >
                  <div className="font-bold">⚡ LATENCY SPIKE</div>
                  <div className="text-[10px] text-slate-500">Set delay to 2,850ms</div>
                </button>

                <button
                  onClick={resetTelemetryToNormal}
                  className="bg-slate-950 border border-emerald-500/40 hover:bg-emerald-950/40 text-emerald-300 p-2.5 rounded-lg text-left transition-all"
                >
                  <div className="font-bold">↺ RESET TELEMETRY</div>
                  <div className="text-[10px] text-slate-500">Restore normal metrics</div>
                </button>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: STATE LOG & MANUAL ADMIN EMERGENCY RESET */}
          <div className="space-y-5">
            
            {/* Manual Admin Override Card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-slate-200 font-mono flex items-center gap-2">
                <Lock className="w-4 h-4 text-sky-400" />
                ADMIN EMERGENCY CONTROL PANEL
              </h3>

              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2 font-mono text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">BREAKER MODE:</span>
                  <span className={`font-bold ${
                    breakerStatus === 'ACTIVE' ? 'text-emerald-400' : breakerStatus === 'TRIPPED' ? 'text-rose-400' : 'text-amber-400'
                  }`}>
                    {breakerStatus}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-500">
                  <span>Routing Gate:</span>
                  <span>{breakerStatus === 'ACTIVE' ? 'ALLOWING ORDERS' : 'BLOCKING ORDERS'}</span>
                </div>
              </div>

              {breakerStatus === 'TRIPPED' && (
                <button
                  onClick={() => setShowAdminModal(true)}
                  className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 rounded-lg text-xs font-mono transition-colors shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2"
                >
                  <Key className="w-4 h-4" /> RECOVER & OVERRIDE BREAKER
                </button>
              )}

              {breakerStatus === 'OVERRIDE' && (
                <button
                  onClick={() => setBreakerStatus('ACTIVE')}
                  className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-2.5 rounded-lg text-xs font-mono transition-colors shadow-lg shadow-sky-600/30 flex items-center justify-center gap-2"
                >
                  <Unlock className="w-4 h-4" /> RE-ENABLE AUTOMATED SYSTEM
                </button>
              )}

              {breakerStatus === 'ACTIVE' && (
                <div className="text-xs font-mono text-slate-500 text-center py-2 bg-slate-950/40 rounded border border-slate-800/80">
                  System operating in nominal automated state.
                </div>
              )}
            </div>

            {/* Circuit Breaker Log Terminal */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
              <h3 className="text-sm font-bold text-slate-200 font-mono flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                STATE TRANSITION AUDIT LOG
              </h3>

              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 h-64 overflow-y-auto space-y-2 font-mono text-[11px]">
                {breakerLogs.map((log) => (
                  <div key={log.id} className="border-b border-slate-900/80 pb-1.5 leading-relaxed">
                    <span className="text-slate-500">[{log.time}]</span>{' '}
                    <span className={`font-bold ${
                      log.level === 'CRITICAL' ? 'text-rose-400' :
                      log.level === 'WARN' ? 'text-amber-400' :
                      log.level === 'SIMULATION' ? 'text-sky-400' :
                      log.level === 'OVERRIDE' ? 'text-indigo-400' : 'text-emerald-400'
                    }`}>
                      [{log.level}]
                    </span>{' '}
                    <span className="text-slate-300">{log.msg}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ORDER EXECUTION ENGINE WITH SYNCHRONOUS PRE-AUDIT                 */}
      {/* ========================================================================= */}
      {activeTab === 'execution' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          
          {/* LEFT COLUMN: ORDER STAGING PANEL */}
          <div className="space-y-5">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-200 font-mono flex items-center gap-2">
                  <Zap className="w-4 h-4 text-sky-400" />
                  ORDER STAGING & CONFIGURATION
                </h3>
                <span className="text-xs text-slate-500 font-mono">{orderConfig.symbol}</span>
              </div>

              <div className="space-y-3 font-mono text-xs">
                {/* Action Switcher: BUY / SELL */}
                <div>
                  <label className="text-slate-400 text-[11px] block mb-1">TRANSACTION SIDE</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setOrderConfig(prev => ({ ...prev, action: 'BUY' }))}
                      className={`py-2 rounded-lg font-bold transition-all ${
                        orderConfig.action === 'BUY'
                          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                          : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      BUY
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderConfig(prev => ({ ...prev, action: 'SELL' }))}
                      className={`py-2 rounded-lg font-bold transition-all ${
                        orderConfig.action === 'SELL'
                          ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                          : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      SELL
                    </button>
                  </div>
                </div>

                {/* Order Type */}
                <div>
                  <label className="text-slate-400 text-[11px] block mb-1">ORDER TYPE</label>
                  <select
                    value={orderConfig.orderType}
                    onChange={(e) => setOrderConfig(prev => ({ ...prev, orderType: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono focus:outline-none focus:border-sky-500"
                  >
                    <option value="LIMIT">LIMIT ORDER</option>
                    <option value="MARKET">MARKET ORDER</option>
                    <option value="STOP_LOSS">STOP LOSS</option>
                  </select>
                </div>

                {/* Quantity Input */}
                <div>
                  <label className="text-slate-400 text-[11px] block mb-1">SHARE QUANTITY</label>
                  <input
                    type="number"
                    min="1"
                    value={orderConfig.quantity}
                    onChange={(e) => setOrderConfig(prev => ({ ...prev, quantity: Math.max(1, parseInt(e.target.value) || 0) }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* Price Input */}
                <div>
                  <label className="text-slate-400 text-[11px] block mb-1">EXECUTION PRICE ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={orderConfig.customPrice}
                    onChange={(e) => setOrderConfig(prev => ({ ...prev, customPrice: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* Notional Value Calculation */}
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>CALCULATED NOTIONAL:</span>
                    <span className="text-sky-400 font-bold">
                      ${(orderConfig.quantity * orderConfig.customPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[10px]">
                    <span>Portfolio Capital %:</span>
                    <span>{(((orderConfig.quantity * orderConfig.customPrice) / currentCapital) * 100).toFixed(2)}%</span>
                  </div>
                </div>

                {/* Step 1: Trigger Synchronous Risk Audit */}
                <button
                  type="button"
                  onClick={runPreExecutionCheck}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-lg transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" /> 1. RUN PRE-EXECUTION CIRCUIT AUDIT
                </button>
              </div>
            </div>
          </div>

          {/* MIDDLE COLUMN: PRE-EXECUTION AUDIT GATE & DISPATCH */}
          <div className="lg:col-span-2 space-y-5">
            
            {/* Pre-Execution Audit Step Status Card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-200 font-mono flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  PRE-EXECUTION SYNCHRONOUS AUDIT GATE
                </h3>
                <span className="text-xs text-slate-500 font-mono">Middleware Gatekeeper</span>
              </div>

              {/* Audit Idle State */}
              {orderAuditStatus === null && (
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-8 text-center space-y-2 font-mono">
                  <Terminal className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">
                    Order staging complete. Click <strong className="text-indigo-400">"RUN PRE-EXECUTION CIRCUIT AUDIT"</strong> to query risk rules prior to dispatch.
                  </p>
                </div>
              )}

              {/* Audit Checking Spinner */}
              {orderAuditStatus === 'CHECKING' && (
                <div className="bg-slate-950/60 border border-sky-500/30 rounded-lg p-8 text-center space-y-3 font-mono">
                  <RefreshCw className="w-7 h-7 text-sky-400 mx-auto animate-spin" />
                  <p className="text-xs text-sky-300 font-bold">
                    EVALUATING AGENTIC SAFETY RULES AGAINST LIVE TELEMETRY...
                  </p>
                </div>
              )}

              {/* Audit Passed */}
              {orderAuditStatus === 'PASSED' && (
                <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-lg p-5 space-y-4 font-mono">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-emerald-300">PRE-TRADE AUDIT PASSED (RISK APPROVED)</h4>
                      <p className="text-xs text-emerald-400/80">
                        Zero policy violations detected across Drawdown, Rate Limit, Anti-Loop, and Concentration limits.
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-emerald-900/50 pt-3 flex items-center justify-between">
                    <div className="text-xs text-slate-300">
                      Ready to transmit order for <strong className="text-white">{orderConfig.quantity} {orderConfig.symbol}</strong> @ ${orderConfig.customPrice}
                    </div>
                    <button
                      onClick={handleExecuteOrder}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold px-5 py-2.5 rounded-lg text-xs tracking-wider transition-all shadow-lg shadow-emerald-500/30 flex items-center gap-2"
                    >
                      <Zap className="w-4 h-4 fill-current" /> 2. DISPATCH ORDER TO BROKER
                    </button>
                  </div>
                </div>
              )}

              {/* Audit Failed */}
              {orderAuditStatus === 'FAILED' && (
                <div className="bg-rose-950/30 border border-rose-500/40 rounded-lg p-5 space-y-4 font-mono">
                  <div className="flex items-start gap-3">
                    <XCircle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
                    <div className="space-y-2">
                      <h4 className="text-sm font-bold text-rose-300">ORDER REJECTED BY CIRCUIT BREAKER ENGINE</h4>
                      <p className="text-xs text-rose-400/80">
                        Execution blocked! The following safety rule violations occurred during validation:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-xs text-rose-200 bg-slate-950/60 p-3 rounded border border-rose-900/60">
                        {auditFailReasons.map((reason, idx) => (
                          <li key={idx}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="text-xs text-slate-400 bg-slate-950/40 p-2.5 rounded border border-slate-800 text-center">
                    Navigate to <strong className="text-sky-400">Tab 2: Circuit Breaker</strong> to resolve telemetry breaches or apply admin override.
                  </div>
                </div>
              )}
            </div>

            {/* Simulated Live Order Book / Execution Log */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
              <h3 className="text-sm font-bold text-slate-200 font-mono flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-400" />
                SIMULATED ORDER BOOK & DISPATCH LOG
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono text-left border-collapse">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-800 bg-slate-950/40">
                      <th className="py-2.5 px-3">ORDER ID</th>
                      <th className="py-2.5 px-3">TIME</th>
                      <th className="py-2.5 px-3">SIDE</th>
                      <th className="py-2.5 px-3">SYMBOL</th>
                      <th className="py-2.5 px-3">QTY</th>
                      <th className="py-2.5 px-3">PRICE</th>
                      <th className="py-2.5 px-3">NOTIONAL</th>
                      <th className="py-2.5 px-3">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {orderBook.map((ord) => (
                      <tr key={ord.id} className="hover:bg-slate-950/40">
                        <td className="py-2.5 px-3 font-bold text-slate-200">{ord.id}</td>
                        <td className="py-2.5 px-3 text-slate-400">{ord.time}</td>
                        <td className={`py-2.5 px-3 font-bold ${ord.action === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {ord.action}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-sky-400">{ord.symbol}</td>
                        <td className="py-2.5 px-3">{ord.qty}</td>
                        <td className="py-2.5 px-3">${ord.price.toFixed(2)}</td>
                        <td className="py-2.5 px-3">${ord.notional.toLocaleString()}</td>
                        <td className="py-2.5 px-3">
                          <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
                            {ord.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ADMIN OVERRIDE MODAL */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4 font-mono">
            <div className="flex items-center gap-3 text-rose-400">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-100">EMERGENCY ADMIN OVERRIDE</h3>
            </div>

            <p className="text-xs text-slate-400">
              Enter the authorized administrator security key to bypass current agentic risk halt condition and re-enable active trading state.
            </p>

            <form onSubmit={handleAdminResetSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">SECURITY KEY</label>
                <input
                  type="password"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  placeholder="AUTHORIZED_ADMIN_KEY"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              {adminError && (
                <div className="text-[11px] text-rose-400 font-bold bg-rose-950/40 p-2 rounded border border-rose-900">
                  {adminError}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowAdminModal(false); setAdminError(''); }}
                  className="w-1/2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-2 rounded-lg font-bold transition-colors"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-rose-600 hover:bg-rose-500 text-white text-xs py-2 rounded-lg font-bold transition-colors shadow-lg shadow-rose-600/30"
                >
                  AUTHENTICATE & UNLOCK
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}