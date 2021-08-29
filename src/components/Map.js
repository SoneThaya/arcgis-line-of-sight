import React, { useEffect, useRef } from "react";
import { loadModules } from "esri-loader";

const Map = () => {
  const MapEl = useRef(null);

  useEffect(() => {
    loadModules([
      "esri/WebScene",
      "esri/views/SceneView",
      "esri/widgets/LineOfSight",
      "esri/widgets/Expand",
      "esri/geometry/Point",
      "esri/Graphic",
      "esri/core/watchUtils",
    ]).then(
      ([
        WebScene,
        SceneView,
        LineOfSight,
        Expand,
        Point,
        Graphic,
        watchUtils,
      ]) => {
        const scene = new WebScene({
          portalItem: {
            id: "82127fea11d6439abba3318cb93252f7",
          },
        });

        const view = new SceneView({
          map: scene,
          container: "viewDiv",
        });

        /**************************************
         * Initialize the LineOfSight widget
         **************************************/

        const lineOfSight = new LineOfSight({
          view: view,
          container: "losWidget",
        });

        /**************************************
         * Add symbols to mark the intersections
         * for the line of sight
         **************************************/

        const viewModel = lineOfSight.viewModel;

        // watch when observer location changes
        viewModel.watch("observer", (value) => {
          setIntersectionMarkers();
        });

        // watch when a new target is added or removed
        viewModel.targets.on("change", (event) => {
          event.added.forEach((target) => {
            setIntersectionMarkers();
            // for each target watch when the intersection changes
            target.watch("intersectedLocation", setIntersectionMarkers);
          });
        });

        // an inverted cone marks the intersection that occludes the view
        const intersectionSymbol = {
          type: "point-3d",
          symbolLayers: [
            {
              type: "object",
              resource: { primitive: "inverted-cone" },
              material: { color: [255, 100, 100] },
              height: 10,
              depth: 10,
              width: 10,
              anchor: "relative",
              anchorPosition: { x: 0, y: 0, z: -0.7 },
            },
          ],
        };

        function setIntersectionMarkers() {
          view.graphics.removeAll();
          viewModel.targets.forEach((target) => {
            if (target.intersectedLocation) {
              const graphic = new Graphic({
                symbol: intersectionSymbol,
                geometry: target.intersectedLocation,
              });
              view.graphics.add(graphic);
            }
          });
        }

        /**************************************
         * Create an analysis by setting
         * the initial observer and four targets
         **************************************/

        viewModel.observer = new Point({
          latitude: 42.3521,
          longitude: -71.0564,
          z: 139,
        });

        viewModel.targets = [
          createTarget(42.3492, -71.0529),
          createTarget(42.3477, -71.0542),
          createTarget(42.3485, -71.0533),
          createTarget(42.3467, -71.0549),
        ];

        function createTarget(lat, lon, z) {
          return {
            location: new Point({
              latitude: lat,
              longitude: lon,
              z: z || 0,
            }),
          };
        }

        // start the tool to create the line of sight analysis
        viewModel.start();
        // resume the analysis
        watchUtils.whenEqualOnce(viewModel, "state", "creating", () => {
          viewModel.stop();
        });

        // add an Expand widget to make the menu responsive
        const expand = new Expand({
          expandTooltip: "Expand line of sight widget",
          view: view,
          content: document.getElementById("menu"),
          expanded: true,
        });

        view.ui.add(expand, "top-right");

        view.when(() => {
          // allow user to turn the layer with new planned buildings on/off
          // and see how the line of sight analysis changes
          const plannedBuildingsLayer = view.map.layers
            .filter((layer) => {
              return (
                layer.title === "Boston major projects - MajorProjectsBuildings"
              );
            })
            .getItemAt(0);

          document
            .getElementById("layerVisibility")
            .addEventListener("change", (event) => {
              plannedBuildingsLayer.visible = event.target.checked;
            });
        });
      }
    );
  }, []);

  return (
    <>
      <div id="viewDiv" style={{ height: "100vh", width: "100vw" }} ref={MapEl}>
        <div id="viewDiv">
          <div id="menu" className="esri-widget">
            <h3>Line of sight analysis</h3>
            <input type="checkbox" id="layerVisibility" checked />
            <label for="layerVisibility">Show development layer</label>
            <div id="losWidget"></div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Map;
