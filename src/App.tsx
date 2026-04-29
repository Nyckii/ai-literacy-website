import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { NotFound } from './pages/NotFound';
import { ConfirmationBias } from './pages/games/ConfirmationBias';
import { MeasurementBias } from './pages/games/MeasurementBias';
import { AlgorithmBias } from './pages/games/AlgorithmBias';
import { LearningBias } from './pages/games/LearningBias';
import { InteractionBias } from './pages/games/InteractionBias';
import { StereotypingBias } from './pages/games/StereotypingBias';
import { HistoricalBias } from './pages/games/HistoricalBias';
import { ExclusionBias } from './pages/games/ExclusionBias';
import { RepresentationBias } from './pages/games/RepresentationBias';
import { MappingBias } from './pages/games/MappingBias';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="games/confirmation-bias" element={<ConfirmationBias />} />
          <Route path="games/measurement-bias" element={<MeasurementBias />} />
          <Route path="games/algorithm-bias" element={<AlgorithmBias />} />
          <Route path="games/learning-bias" element={<LearningBias />} />
          <Route path="games/interaction-bias" element={<InteractionBias />} />
          <Route path="games/stereotyping-bias" element={<StereotypingBias />} />
          <Route path="games/historical-bias" element={<HistoricalBias />} />
          <Route path="games/exclusion-bias" element={<ExclusionBias />} />
          <Route path="games/representation-bias" element={<RepresentationBias />} />
          <Route path="games/mapping-bias" element={<MappingBias />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
