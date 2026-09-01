import { useState, useEffect, useMemo } from "react";

const MOCK_ASSETS = [
  { id: "1", name: "Apple Inc.", category: "Stocks", quantity: 15, currentPrice: 185.5 },
  { id: "2", name: "US Treasury 10Y", category: "Bonds", quantity: 50, currentPrice: 98.2 },
  { id: "3", name: "NVIDIA Corp.", category: "Stocks", quantity: 10, currentPrice: 875.0 },
  { id: "4", name: "Vanguard S&P 500 ETF", category: "ETFs", quantity: 25, currentPrice: 460.1 },
  { id: "5", name: "Corporate High Yield Bond", category: "Bonds", quantity: 30, currentPrice: 102.4 },
];
const USD_TO_EUR = 0.92;
const convertToCurrency = (value, currency) =>
  currency === "USD" ? value : value * USD_TO_EUR;
// ==========================================
// 1. CHILD COMPONENTS (PROPS PASSING)
// ==========================================
const FilterBar = ({
  searchTerm,
  setSearchTerm,
  selectedCategory,
  setSelectedCategory,
  currency,
  setCurrency,
}) => {
  return (
    <div className="filter-bar">
      <input
        data-testid="search-input"
        placeholder="Filter by asset name..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <select
        data-testid="category-select"
        value={selectedCategory}
        onChange={(e) => setSelectedCategory(e.target.value)}
      >
        <option value="All">All Categories</option>
        <option value="Stocks">Stocks</option>
        <option value="Bonds">Bonds</option>
        <option value="ETFs">ETFs</option>
      </select>
      <button
        data-testid="currency-toggle"
        onClick={() =>
          setCurrency((prev) => (prev === "USD" ? "EUR" : "USD"))
        }
      >
        Currency: {currency}
      </button>
    </div>
  );
};

const PortfolioMetrics = ({ totalValue, currency, assetCount }) => {
  const symbol = currency === "USD" ? "$" : "€";
  const convertedValue = convertToCurrency(totalValue, currency);
  return (
    <div className="metrics-card" data-testid="portfolio-metrics">
      <h2>Portfolio Summary</h2>

      <p data-testid="total-value">
        Total Value: {symbol}
        {convertedValue.toFixed(2)}
      </p>

      <p data-testid="asset-count">
        Matching Assets: {assetCount}
      </p>
    </div>
  );
};

const AssetTable = ({ assets, currency }) => {
  const symbol = currency === "USD" ? "$" : "€";
  return (
    <table data-testid="asset-table">
      <thead>
        <tr>
          <th>Asset Name</th>
          <th>Category</th>
          <th>Quantity</th>
          <th>Price</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        {assets.map((asset) => {
          const convertedPrice = convertToCurrency(
            asset.currentPrice,
            currency
          );

          const convertedTotal = convertToCurrency(
            asset.quantity * asset.currentPrice,
            currency
          );
          return (
            <tr key={asset.id} data-testid={`asset-row-${asset.id}`}>
              <td>{asset.name}</td>
              <td>{asset.category}</td>
              <td>{asset.quantity}</td>
              <td>
                {symbol}
                {convertedPrice.toFixed(2)}
              </td>
              <td>
                {symbol}
                {convertedTotal.toFixed(2)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

// ==========================================
// 2. PARENT DASHBOARD COMPONENT
// ==========================================

export default function App2() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [currency, setCurrency] = useState("USD");

  // useEffect 1 - Fetch data after 600ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setAssets(MOCK_ASSETS);
      setLoading(false);
    }, 600);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  // useMemo
  const { filteredAssets, totalValue } = useMemo(() => {
    // Required by question
    window.analyticsMemoCount =
      (window.analyticsMemoCount || 0) + 1;

    const filteredAssets = assets.filter((asset) => {
      const matchesSearch = asset.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      const matchesCategory =
        selectedCategory === "All" ||
        asset.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });

    const totalValue = filteredAssets.reduce(
      (sum, asset) => sum + asset.quantity * asset.currentPrice,
      0
    );
    return {
      filteredAssets,
      totalValue,
    };
  }, [assets, searchTerm, selectedCategory]);

  // useEffect 2 - Update title
  useEffect(() => {
    const convertedTotal = convertToCurrency(totalValue, currency);
    document.title = `Portfolio - Total: ${convertedTotal.toFixed(2)}`;
  }, [currency, totalValue]);

  return (
    <div className="app-container" data-testid="app-container">
      <h1>Investment Analytics Dashboard</h1>

      <FilterBar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        currency={currency}
        setCurrency={setCurrency}
      />

      {loading ? (
        <p data-testid="loading-text">
          Loading portfolio data...
        </p>
      ) : (
        <>
          <PortfolioMetrics
            totalValue={totalValue}
            currency={currency}
            assetCount={filteredAssets.length}
          />

          <AssetTable
            assets={filteredAssets}
            currency={currency}
          />
        </>
      )}
    </div>
  );
}