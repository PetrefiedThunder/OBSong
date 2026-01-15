import React from 'react';
import { useTour } from './TourProvider';

export function TourPopup() {
  const { tourStep, nextStep, stopTour } = useTour();

  if (!tourStep) {
    return null;
  }

  const popupStyle: React.CSSProperties = {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: '#2d3748',
    color: 'white',
    padding: '2rem',
    borderRadius: '0.5rem',
    zIndex: 1000,
    maxWidth: '400px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  };

  const buttonStyle: React.CSSProperties = {
    backgroundColor: '#4299e1',
    color: 'white',
    padding: '0.5rem 1rem',
    borderRadius: '0.25rem',
    border: 'none',
    cursor: 'pointer',
    marginTop: '1rem',
  };

  return (
    <div style={popupStyle}>
      <h3>{tourStep.title}</h3>
      <p>{tourStep.content}</p>
      <button style={buttonStyle} onClick={nextStep}>
        Next
      </button>
      <button style={{ ...buttonStyle, backgroundColor: '#a0aec0', marginLeft: '1rem' }} onClick={stopTour}>
        Skip Tour
      </button>
    </div>
  );
}
