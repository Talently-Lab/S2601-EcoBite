import { useState } from 'react';
import { Routes, Route, Navigate, Outlet, useNavigate } from 'react-router';
import { Navbar } from './components/layouts/Navbar';
import { Header } from './components/layouts/Header';
import { Login } from './pages/Login';
import { Restaurants } from './pages/Restaurants';
import { Cart } from './pages/Cart';
import { Impact } from './pages/Impact';
import { Profile } from './pages/Profile';
import { Home } from './pages/Home';

export default function App() {
	const [user, setUser] = useState(null);
	const navigate = useNavigate();

	const handleLogin = (authenticatedUser) => {
		setUser(authenticatedUser);
		navigate('/', { replace: true });
	};

	const handleLogout = () => {
		setUser(null);
		navigate('/login', { replace: true });
	};

	return (
			<Routes>
				<Route path="/login" element={
					user ? <Navigate to="/" replace /> : <main><Login onLogin={handleLogin} /></main>
				} />
				<Route element={
					user
						? <><Header user={user} onLogout={handleLogout} /><main><Outlet /><Navbar/></main></>
						: <Navigate to="/login" replace />
				}>
					<Route path="/" element={<Home />} />
					<Route path="/restaurants" element={<Restaurants />} />
					<Route path="/cart" element={<Cart />} />
					<Route path="/impact" element={<Impact />} />
					<Route path="/profile" element={<Profile />} />
				</Route>
			</Routes>
	);
}
