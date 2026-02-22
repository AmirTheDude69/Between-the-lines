import { createBrowserRouter } from "react-router";
import { GalleryPage } from "./pages/GalleryPage";
import { GamePage } from "./pages/GamePage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: GalleryPage,
  },
  {
    path: "/game/:gameId",
    Component: GamePage,
  },
]);
