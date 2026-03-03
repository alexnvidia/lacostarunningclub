import { Routes, Route, Outlet } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'

// Lazy pages — public
const Home = lazy(() => import('@/pages/public/Home'))
const Tienda = lazy(() => import('@/pages/public/Tienda'))
const ProductoDetalle = lazy(() => import('@/pages/public/ProductoDetalle'))
const Performance = lazy(() => import('@/pages/public/Performance'))

// Lazy pages — auth
const Login = lazy(() => import('@/pages/auth/Login'))
const Registro = lazy(() => import('@/pages/auth/Registro'))
const RecuperarContrasena = lazy(() => import('@/pages/auth/RecuperarContrasena'))

// Lazy pages — dashboard (protected)
const DashboardHome = lazy(() => import('@/pages/dashboard/DashboardHome'))
const Perfil = lazy(() => import('@/pages/dashboard/Perfil'))
const Pedidos = lazy(() => import('@/pages/dashboard/Pedidos'))
const PedidoDetalle = lazy(() => import('@/pages/dashboard/PedidoDetalle'))
const Soporte = lazy(() => import('@/pages/dashboard/Soporte'))
const TicketDetalle = lazy(() => import('@/pages/dashboard/TicketDetalle'))
const MisCarreras = lazy(() => import('@/pages/dashboard/MisCarreras'))
const SubirResultado = lazy(() => import('@/pages/dashboard/SubirResultado'))

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d0d0d]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 rounded-full border-2 border-[#e63946] border-t-transparent animate-spin" />
        <p className="text-gray-500 text-sm">Cargando...</p>
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
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/tienda" element={<Tienda />} />
          <Route path="/tienda/:id" element={<ProductoDetalle />} />
          <Route path="/performance" element={<Performance />} />
        </Route>

        {/* Auth routes (sin Navbar/Footer) */}
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/recuperar-contrasena" element={<RecuperarContrasena />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<PublicLayout />}>
            <Route path="/dashboard" element={<DashboardHome />} />
            <Route path="/perfil" element={<Perfil />} />
            <Route path="/pedidos" element={<Pedidos />} />
            <Route path="/pedidos/:id" element={<PedidoDetalle />} />
            <Route path="/soporte" element={<Soporte />} />
            <Route path="/soporte/:id" element={<TicketDetalle />} />
            <Route path="/mis-carreras" element={<MisCarreras />} />
            <Route path="/subir-resultado" element={<SubirResultado />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  )
}
