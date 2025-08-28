import React, { useState, useEffect, useCallback } from 'react';
import Map from 'react-map-gl/maplibre';
import { DeckGL } from '@deck.gl/react';
import { GeoJsonLayer, PolygonLayer } from '@deck.gl/layers';
import { LightingEffect, AmbientLight, _SunLight as SunLight } from '@deck.gl/core';
import { scaleThreshold } from 'd3-scale';
import type { Color, Position, PickingInfo, MapViewState } from '@deck.gl/core';
import type { Feature, Geometry } from 'geojson';

// Couleurs pour le GeoJsonLayer (6 classes)
export const COLOR_SCALE = scaleThreshold<number, Color>()
  .domain([100, 200, 300, 500, 800])
  .range([
    [254, 235, 226],
    [252, 197, 192],
    [250, 159, 181],
    [247, 104, 161],
    [197, 27, 138],
    [122, 1, 119]
  ]);

export const getFillColor = (d: number | null | undefined): Color =>
  d == null ? [255, 255, 255] : COLOR_SCALE(d);

const INITIAL_VIEW_STATE: { main: MapViewState; minimap: MapViewState } = {
  main: {
    latitude: 40.7128,
    longitude: -74.0060,
    zoom: 10,
    maxZoom: 16,
    pitch: 60,
    bearing: -90
  },
  minimap: {
    latitude: 40.7128,
    longitude: -74.0060,
    zoom: 4
  }
};

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

const ambientLight = new AmbientLight({ color: [255, 255, 255], intensity: 1.0 });
const dirLight = new SunLight({
  timestamp: Date.UTC(2019, 7, 1, 14),
  color: [255, 255, 255],
  intensity: 1.0,
  _shadow: true
});

const landCover: Position[][] = [[
  [-74.2591, 40.4774],
  [-74.2591, 40.9176],
  [-73.7002, 40.9176],
  [-73.7002, 40.4774],
  [-74.2591, 40.4774]
]];

function getTooltip({ object }: PickingInfo<Feature<Geometry, any> | null>) {
  if (!object) return null;
  const props = 'properties' in object ? object.properties : object;
  if (!props) return null;

  return {
    html: `
      <div style="color: white; font-weight: bold; font-size: 18px">${props["County_min"] ?? ''}</div>
      <div style="color: white; font-weight: normal;">${props["Name_min"] ?? ''}</div>
      <div style="color: lightgray;"><b>Median sales values:</b></div>
      <div style="color: lightgray;">$${props["price_median"]?.toLocaleString() ?? 'N/A'} USD</div>
    `
  };
}

export default function App({ mapStyle = MAP_STYLE }: { mapStyle?: string }) {
  const [data, setData] = useState<Feature<Geometry, any>[] | null>(null);
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);

  // Chargement du GeoJSON local
  useEffect(() => {
    fetch('./data/USA.geojson')
      .then(res => res.json())
      .then(geojson => setData(geojson.features));
  }, []);

  const [effects] = useState(() => {
    const lightingEffect = new LightingEffect({ ambientLight, dirLight });
    lightingEffect.shadowColor = [0, 0, 0, 0.5];
    return [lightingEffect];
  });

  const onViewStateChange = useCallback(({ viewState: newViewState }: any) => {
    setViewState({
      main: newViewState,
      minimap: {
        ...viewState.minimap,
        longitude: newViewState.longitude,
        latitude: newViewState.latitude
      }
    });
  }, [viewState.minimap]);

  if (!data) return <div>Loading...</div>;

  // Layers carte principale (3D) avec animation d'extrusion
  const layers = [
    new PolygonLayer<Position[]>({
      id: 'ground',
      data: landCover,
      stroked: false,
      getPolygon: f => f,
      getFillColor: [0, 0, 0, 0]
    }),
    new GeoJsonLayer<any>({
      id: 'geojson',
      data,
      opacity: 0.8,
      
      stroked: false,
      filled: true,
      extruded: true,
      wireframe: true,
      getElevation: f => Math.sqrt(f.properties["price_median"]) * 2,
      getFillColor: f => getFillColor(f.properties["TAUG2"]),
      getLineColor: [255, 255, 255],
      pickable: true,
      transitions: {
        getElevation: 2000 // animation 2s pour l’extrusion
      }
    })
  ];

  const minimapLayers = [
    new PolygonLayer<Position[]>({
      id: 'ground-minimap',
      data: landCover,
      stroked: false,
      getPolygon: f => f,
      getFillColor: [200, 200, 200, 100]
    }),
    new GeoJsonLayer<any>({
      id: 'geojson-minimap',
      data,
      stroked: false,
      filled: true,
      extruded: false,
      wireframe: false,
      getFillColor: f => getFillColor(f.properties["TAUG2"]),
      pickable: false
    })
  ];

  const minimapStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '2%',
    right: '2%',
    width: '15vw',
    height: '15vw',
    maxWidth: '300px',
    maxHeight: '300px',
    borderRadius: '0rem',
    overflow: 'hidden',
    boxShadow: '0 0 10px 2px rgba(0,0,0,0.15)',
    zIndex: 1000
  };

  return (
    <>
      {/* Carte principale */}
      <DeckGL
        layers={layers}
        effects={effects}
        initialViewState={viewState.main}
        controller={true}
        getTooltip={getTooltip}
        onViewStateChange={onViewStateChange}
      >
        <Map reuseMaps mapStyle={mapStyle} />
      </DeckGL>

      {/* Légende responsive */}
      <div
        style={{
          position: "absolute",
          top: "2%",
          left: "2%",
          backgroundColor: "white",
          padding: "1rem",
          borderRadius: "0rem",
          boxShadow: "0 0 5px rgba(0,0,0,0.3)",
          zIndex: 1000,
          maxWidth: "30vw",
          transform: "scale(0.75)",
          transformOrigin: "top left"
        }}
      >
        <p style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 'bold', fontSize: 'clamp(14px, 2vw, 20px)' }}>
          REAL ESTATE IN NYC
        </p>
        <p style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 'normal', fontSize: 'clamp(12px, 1.8vw, 18px)' }}>
          Increase in real estate prices (%) 2003-2023
        </p>
        <img
          src="/export.svg"
          alt="Legend"
          style={{ display: "block", width: "100%", height: "auto" }}
        />
        <p style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 'normal', fontSize: 'clamp(10px, 1.2vw, 12px)', paddingTop: '1rem' }}>
          Source: NYC Open Data, Zillow
        </p>
      </div>

      {/* MiniMap responsive */}
      <div style={minimapStyle}>
        <DeckGL
          layers={minimapLayers}
          viewState={viewState.minimap}
          controller={false}
          pickingRadius={0}
        >
          <Map reuseMaps mapStyle={mapStyle} />
        </DeckGL>
      </div>
    </>
  );
}
