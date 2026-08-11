import { Navigate, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import CategoryPage from './pages/CategoryPage';
import TypePage from './pages/TypePage';
import ItemPage from './pages/ItemPage';
import SearchPage from './pages/SearchPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/category/:categorySlug" element={<CategoryPage />} />
      <Route path="/category/:categorySlug/type/:typeSlug" element={<TypePage />} />
      <Route path="/item/:itemId" element={<ItemPage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
