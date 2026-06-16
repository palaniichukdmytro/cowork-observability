import React from 'react';
import { type AppRootProps } from '@grafana/data';
import { Route, Routes } from 'react-router-dom';

const Home = React.lazy(() => import('../../pages/Home'));

function App(_props: AppRootProps) {
  return (
    <Routes>
      <Route path="*" element={<Home />} />
    </Routes>
  );
}

export default App;
