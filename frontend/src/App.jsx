import { Routes, Route, Navigate, Outlet } from 'react-router';
import { useUser } from './context/UserContext';
import { Header } from './components/layouts/Header';
import { Footer } from './components/layouts/Footer';
import { Login } from './pages/Login';
import { Restaurants } from './pages/Restaurants';
import { RestaurantMenu } from './pages/RestaurantMenu';
import { Cart } from './pages/Cart';
import { Impact } from './pages/Impact';
import { Profile } from './pages/Profile';
import { Home } from './pages/Home';
import { CartProvider } from './context/CartProvider';
import { Checkout } from './pages/Checkout';
import { ConfirmationModal } from './components/pages/ConfirmationModal';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminLayout } from './components/layouts/AdminLayout';
import { ADMIN_DASHBOARD_PATH } from './config/admin';

const HOME_BY_ROLE = {
	ADMIN: ADMIN_DASHBOARD_PATH,
	CLIENT: '/',
};

const getHomePath = (user) => user ? HOME_BY_ROLE[user.role] : '/login';

export default function App() {
	const { user, isLoading } = useUser();
	if (isLoading) return <main role="status">Cargando sesión...</main>;

	return (
			<Routes>
				<Route path="/login" element={
					user ? <Navigate to={getHomePath(user)} replace /> : <main><Login /></main>
				} />
				<Route path="/admin" element={
					user?.role === 'ADMIN' ? <AdminLayout /> : <Navigate to={getHomePath(user)} replace />
				}>
					<Route index element={<Navigate to="dashboard" replace />} />
					<Route path="dashboard" element={<AdminDashboard />} />
				</Route>
				<Route element={
					user?.role === 'CLIENT'
						? <CartProvider key={user.id} userId={user.id}>
                                <Header />
                                <main tabIndex={-1}>
                                    <Outlet />
                                </main>
                                <Footer />
                                <ConfirmationModal />
                            </CartProvider>
						: <Navigate to={getHomePath(user)} replace />
				}>
					<Route path="/" element={<Home />} />
					<Route path="/restaurants" element={<Restaurants />} />
					<Route path="/restaurants/:id" element={<RestaurantMenu />} />
					<Route path="/cart" element={<Cart />} />
					<Route path="/checkout" element={<Checkout />} />
					<Route path="/impact" element={<Impact />} />
					<Route path="/profile" element={<Profile />} />
				</Route>
				<Route path="*" element={<Navigate to={getHomePath(user)} replace />} />
			</Routes>
	);
}
