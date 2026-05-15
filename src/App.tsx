import { BrowserRouter, Route, Routes } from "react-router-dom";
import { BiasRecap } from "./components/BiasRecap";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { NotFound } from "./pages/NotFound";
import { AlgorithmBias } from "./pages/games/AlgorithmBias";
import { ConfirmationBias } from "./pages/games/ConfirmationBias";
import { ExclusionBias } from "./pages/games/ExclusionBias";
import { HistoricalBias } from "./pages/games/HistoricalBias";
import { InteractionBias } from "./pages/games/InteractionBias";
import { LearningBias } from "./pages/games/LearningBias";
import { MappingBias } from "./pages/games/MappingBias";
import { MeasurementBias } from "./pages/games/MeasurementBias";
import { RepresentationBias } from "./pages/games/RepresentationBias";
import { StereotypingBias } from "./pages/games/StereotypingBias";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route
            path="games/confirmation-bias"
            element={<ConfirmationBias />}
          />
          <Route path="games/measurement-bias" element={<MeasurementBias />} />
          <Route path="games/algorithm-bias" element={<AlgorithmBias />} />
          <Route path="games/learning-bias" element={<LearningBias />} />
          <Route path="games/interaction-bias" element={<InteractionBias />} />
          <Route
            path="games/stereotyping-bias"
            element={<StereotypingBias />}
          />
          <Route path="games/historical-bias" element={<HistoricalBias />} />
          <Route path="games/exclusion-bias" element={<ExclusionBias />} />
          <Route
            path="games/representation-bias"
            element={<RepresentationBias />}
          />
          <Route path="games/mapping-bias" element={<MappingBias />} />
          <Route path="bias-recap" element={<BiasRecap />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
