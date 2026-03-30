import { Routes, Route, Outlet } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { AdminRoute } from '@/components/layout/AdminRoute'
import { PwaUpdatePrompt } from '@/components/ui/PwaUpdatePrompt'

// Lazy pages — public
const Home = lazy(() => import('@/pages/public/Home'))
const Store = lazy(() => import('@/pages/public/Shop'))
const ProductDetail = lazy(() => import('@/pages/public/ProductDetail'))
const Performance = lazy(() => import('@/pages/public/Performance'))

// Lazy pages — auth
const Login = lazy(() => import('@/pages/auth/Login'))
const Register = lazy(() => import('@/pages/auth/Register'))
const RecoverPassword = lazy(() => import('@/pages/auth/RecoverPassword'))

// Lazy pages — dashboard (protected)
const DashboardHome = lazy(() => import('@/pages/dashboard/DashboardHome'))
const Profile = lazy(() => import('@/pages/dashboard/Profile'))
const Orders = lazy(() => import('@/pages/dashboard/Orders'))
const OrderDetail = lazy(() => import('@/pages/dashboard/OrderDetail'))
const Support = lazy(() => import('@/pages/dashboard/Support'))
const TicketDetail = lazy(() => import('@/pages/dashboard/TicketDetail'))
const NewTicket = lazy(() => import('@/pages/dashboard/NewTicket'))
const MyRaces = lazy(() => import('@/pages/dashboard/MyRaces'))
const UploadResult = lazy(() => import('@/pages/dashboard/UploadResult'))

// Lazy pages — admin (protected + role ADMIN)
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'))
const AdminOrders = lazy(() => import('@/pages/admin/AdminOrders'))
const AdminOrderDetail = lazy(() => import('@/pages/admin/AdminOrderDetail'))
const AdminUsers = lazy(() => import('@/pages/admin/AdminUsers'))
const AdminSubscriptions = lazy(() => import('@/pages/admin/AdminSubscriptions'))
const AdminTickets = lazy(() => import('@/pages/admin/AdminTickets'))
const AdminProducts = lazy(() => import('@/pages/admin/AdminProducts'))

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--t-bg)]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--t-accent)] border-t-transparent animate-spin" />
        <p className="text-[var(--t-fg-dimmed)] text-sm">Cargando...</p>
      </div>
    </div>
  )
}

// Layout con Navbar + Footer
function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

export default function App() {
  return (
    <>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/tienda" element={<Store />} />
            <Route path="/tienda/:id" element={<ProductDetail />} />
            <Route path="/performance" element={<Performance />} />
          </Route>

          {/* Auth routes (sin Navbar/Footer) */}
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Register />} />
          <Route path="/recuperar-contrasena" element={<RecoverPassword />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<PublicLayout />}>
              <Route path="/dashboard" element={<DashboardHome />} />
              <Route path="/perfil" element={<Profile />} />
              <Route path="/pedidos" element={<Orders />} />
              <Route path="/pedidos/:id" element={<OrderDetail />} />
              <Route path="/soporte" element={<Support />} />
              <Route path="/soporte/nuevo" element={<NewTicket />} />
              <Route path="/soporte/:id" element={<TicketDetail />} />
              <Route path="/mis-carreras" element={<MyRaces />} />
              <Route path="/subir-resultado" element={<UploadResult />} />
            </Route>
          </Route>

          {/* Admin routes — requires ADMIN role */}
          <Route element={<AdminRoute />}>
            <Route element={<PublicLayout />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/pedidos" element={<AdminOrders />} />
              <Route path="/admin/pedidos/:id" element={<AdminOrderDetail />} />
              <Route path="/admin/usuarios" element={<AdminUsers />} />
              <Route path="/admin/suscripciones" element={<AdminSubscriptions />} />
              <Route path="/admin/tickets" element={<AdminTickets />} />
              <Route path="/admin/productos" element={<AdminProducts />} />
            </Route>

          </Route>
        </Routes>
      </Suspense>
      <PwaUpdatePrompt />
    </>
  )
}
