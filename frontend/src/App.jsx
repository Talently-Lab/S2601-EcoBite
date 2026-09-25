import { useState } from 'react';
import { Routes, Route, Navigate, Outlet, useNavigate } from 'react-router';
import { Navbar } from './components/layouts/Navbar';
import { Login } from './pages/Login';
import { Restaurants } from './pages/Restaurants';
import { Cart } from './pages/Cart';
import { Impact } from './pages/Impact';
import { Profile } from './pages/Profile';
import { Home } from './pages/Home';

export default function App() {
	const [loggedin, setLoggedin] = useState(false);
	const navigate = useNavigate();

	const handleLogin = () => {
		setLoggedin(true);
		navigate('/', { replace: true });
	};

	return (
		<main>
			<Routes>
				<Route path="/login" element={
					loggedin ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} />
				} />
				<Route element={
					loggedin
						? <><Outlet /><Navbar/></>
						: <Navigate to="/login" replace />
				}>
					<Route path="/" element={<Home />} />
					<Route path="/restaurants" element={<Restaurants />} />
					<Route path="/cart" element={<Cart />} />
					<Route path="/impact" element={<Impact />} />
					<Route path="/profile" element={<Profile />} />
				</Route>
			</Routes>
		</main>
	);
}
