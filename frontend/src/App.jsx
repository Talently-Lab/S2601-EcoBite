import { Routes, Route, Navigate, Outlet } from 'react-router';
import { useUser } from './context/UserContext';
import { Header } from './components/layouts/Header';
import { Footer } from './components/layouts/Footer';
import { Login } from './pages/Login';
import { Restaurants } from './pages/Restaurants';
import { Cart } from './pages/Cart';
import { Impact } from './pages/Impact';
import { Profile } from './pages/Profile';
import { Home } from './pages/Home';
import { CartProvider } from './context/CartProvider';
import { Checkout } from './pages/Checkout';

export default function App() {
	const { user } = useUser();

	return (
			<Routes>
				<Route path="/login" element={
					user ? <Navigate to="/" replace /> : <main><Login /></main>
				} />
				<Route element={
					user
						? <CartProvider key={user.id}>
                                <Header />
                                <main>
                                    <Outlet />
                                </main>
                                <Footer />
                            </CartProvider>
						: <Navigate to="/login" replace />
				}>
					<Route path="/" element={<Home />} />
					<Route path="/restaurants" element={<Restaurants />} />
					<Route path="/cart" element={<Cart />} />
					<Route path="/checkout" element={<Checkout />} />
					<Route path="/impact" element={<Impact />} />
					<Route path="/profile" element={<Profile />} />
				</Route>
			</Routes>
	);
}
