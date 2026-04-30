import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

const Layout = () =>
{
    return (
        <div className="min-h-screen bg-gray-100">
            <Sidebar />

            <div className="lg:ml-64">
                <Header />

                <main className="pt-16 min-h-screen">
                    <div className="p-6">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    )
}

export default Layout