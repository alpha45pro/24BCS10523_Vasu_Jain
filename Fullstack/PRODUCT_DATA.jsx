import { useState, useEffect } from "react";
import {
    BrowserRouter,
    Route,
    Routes,
    useSearchParams,
    Link,
    useParams
} from "react-router-dom";
export const PRODUCTS = [
    { id: '101', name: 'Wireless Headphones', category: 'audio', price: 150 },
    { id: '102', name: 'Bluetooth Speaker', category: 'audio', price: 80 },
    { id: '103', name: 'Mechanical Keyboard', category: 'peripherals', price: 120 },
    { id: '104', name: 'Ergonomic Mouse', category: 'peripherals', price: 60 },
    { id: '105', name: '4K Monitor', category: 'display', price: 350 },
];
export function Navbar() {
    return (
        <>
            <nav>
                <Link to={'/products'}>All Products <br /></Link>
                <Link to={'/products?category=audio'}>Audio Only <br /></Link>
                <Link to={'/products?maxPrice=100'}>Under $100 </Link>
            </nav>
        </>
    );
}
export function ProductCatalog() {
    const [searchParams, setSearchParams] = useSearchParams();
    const category = searchParams.get("category") || "";
    const maxPrice = searchParams.get("maxPrice") || "";
    const updateCategory = (e) => {
        setSearchParams({
            category: e.target.value,
            maxPrice
        });
    };
    const updateMaxPrice = (e) => {
        setSearchParams({
            category,
            maxPrice: e.target.value
        });
    };
    const [products, setProducts] = useState(PRODUCTS);
    useEffect(()=>{
        const max = maxPrice ? Number(maxPrice) : null;
        const arr = PRODUCTS.filter((p) => {
            if (category && p.category !== category) {
                return false;
            }
            if (max !== null && !(p.price < max)) {
                return false;
            }
            return true;
        });
        setProducts(arr);
    }, [category, maxPrice]);
    return (
        <>
            <select
                id="category"
                name="category"
                value={category}
                onChange={updateCategory}
            >
                <option value="">All</option>
                <option value="audio">Audio</option>
                <option value="peripherals">Peripherals</option>
                <option value="display">Display</option>
            </select>
            <input
                type="number"
                id="maxPrice"
                placeholder="Enter Max Price"
                value={maxPrice}
                onChange={updateMaxPrice}
            />
            <button onClick={() => setSearchParams({})}>
                Clear
            </button>
            <div>
                {products.length > 0 &&
                    products.map((product) => (
                        <div key={product.id}>
                            <h3>{product.name}</h3>
                            <p>Category: {product.category}</p>
                            <p>Price: ${product.price}</p>
                        </div>
                    ))}
            </div>
        </>
    );
}
function ProductDetail() {
    const { productId } = useParams();
    const [product, setProduct] = useState([]);
    useEffect(() => {
        const arr = PRODUCTS.filter(
            (product) => product.id === productId
        );

        setProduct(arr);
    }, [productId]);
    return (
        <>
            {
                product.length > 0 && (
                    <div>
                        <h2>{product[0].name}</h2>
                        <h2>{product[0].category}</h2>
                        <h2>{product[0].price}</h2>
                    </div>
                )
            }
        </>
    );
}
function ProductsData() {
    return (
        <>
            <BrowserRouter>
                <Navbar />

                <Routes>
                    <Route
                        path={'/products'}
                        element={<ProductCatalog />}
                    />

                    <Route
                        path={'/products/:productId'}
                        element={<ProductDetail />}
                    />
                </Routes>
            </BrowserRouter>
        </>
    );
}
export default ProductsData;