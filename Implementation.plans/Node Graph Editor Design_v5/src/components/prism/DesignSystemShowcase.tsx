import React from 'react';

export const DesignSystemShowcase: React.FC = () => {
  return (
    <div className="fixed top-8 left-8 max-w-md">
      {/* Color Palette Section */}
      <div
        className="rounded-2xl p-6 mb-4"
        style={{
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          backgroundColor: 'rgba(255, 255, 255, 0.06)',
          boxShadow: `
            0 12px 24px rgba(0, 0, 0, 0.18),
            0 32px 64px rgba(0, 0, 0, 0.27),
            inset 0 1px 2px rgba(255, 255, 255, 0.15),
            inset 0 -1px 1px rgba(0, 0, 0, 0.1)
          `,
          border: '1px solid rgba(255, 255, 255, 0.2)',
        }}
      >
        {/* Light source gradient */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 200px 200px at 20% 20%, 
              rgba(255, 255, 255, 0.12) 0%, 
              rgba(255, 255, 255, 0.03) 40%, 
              transparent 60%)`,
          }}
        />
        
        {/* Environmental reflection */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 180px 180px at 85% 85%, 
              rgba(110, 231, 243, 0.04) 0%, 
              transparent 50%)`,
          }}
        />

        {/* Scrim for legibility */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            backgroundColor: 'rgba(28, 33, 48, 0.5)',
          }}
        />

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#ffb84d',
                boxShadow: '0 0 12px #ffb84d80',
              }}
            />
            <div className="font-bebas" style={{ fontSize: '18px', color: '#e6e9ef' }}>
              COLOR SYSTEM
            </div>
          </div>

          {/* Structural Colors */}
          <div className="mb-4">
            <div className="font-bebas mb-2" style={{ fontSize: '12px', color: '#e6e9ef', opacity: 0.7 }}>
              STRUCTURAL
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col gap-1">
                <div
                  className="h-8 rounded"
                  style={{ backgroundColor: '#1c2130' }}
                />
                <div className="font-rama" style={{ fontSize: '9px', color: '#b5bdca' }}>
                  Canvas
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <div
                  className="h-8 rounded"
                  style={{ backgroundColor: '#252d3f' }}
                />
                <div className="font-rama" style={{ fontSize: '9px', color: '#b5bdca' }}>
                  Surface
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <div
                  className="h-8 rounded"
                  style={{ backgroundColor: '#2f3849' }}
                />
                <div className="font-rama" style={{ fontSize: '9px', color: '#b5bdca' }}>
                  Elevated
                </div>
              </div>
            </div>
          </div>

          {/* Semantic Colors */}
          <div className="mb-4">
            <div className="font-bebas mb-2" style={{ fontSize: '12px', color: '#e6e9ef', opacity: 0.7 }}>
              SEMANTIC
            </div>
            <div className="grid grid-cols-5 gap-2">
              {[
                { color: '#ffb84d', label: 'Gold' },
                { color: '#22dd88', label: 'Success' },
                { color: '#f59e0b', label: 'Warning' },
                { color: '#ef4444', label: 'Error' },
                { color: '#6ee7f3', label: 'Info' },
              ].map((item, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <div
                    className="h-8 rounded"
                    style={{ backgroundColor: item.color }}
                  />
                  <div className="font-rama" style={{ fontSize: '8px', color: '#b5bdca' }}>
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Data Type Colors */}
          <div>
            <div className="font-bebas mb-2" style={{ fontSize: '12px', color: '#e6e9ef', opacity: 0.7 }}>
              DATA TYPES
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { color: '#f59e0b', label: 'Scalar', width: '3px' },
                { color: '#22d3ee', label: 'Field', width: '4px' },
                { color: '#f472b6', label: 'Color', width: '4px' },
                { color: '#34d399', label: 'Output', width: '5px' },
              ].map((item, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <div
                    className="h-8 rounded flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                  >
                    <div
                      className="rounded-full"
                      style={{
                        width: item.width,
                        height: '20px',
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                  <div className="font-rama" style={{ fontSize: '8px', color: '#b5bdca' }}>
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Typography Section */}
      <div
        className="rounded-2xl p-6"
        style={{
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          backgroundColor: 'rgba(255, 255, 255, 0.06)',
          boxShadow: `
            0 12px 24px rgba(0, 0, 0, 0.18),
            0 32px 64px rgba(0, 0, 0, 0.27),
            inset 0 1px 2px rgba(255, 255, 255, 0.15),
            inset 0 -1px 1px rgba(0, 0, 0, 0.1)
          `,
          border: '1px solid rgba(255, 255, 255, 0.2)',
        }}
      >
        {/* Light source gradient */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 200px 200px at 20% 20%, 
              rgba(255, 255, 255, 0.12) 0%, 
              rgba(255, 255, 255, 0.03) 40%, 
              transparent 60%)`,
          }}
        />
        
        {/* Environmental reflection */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 180px 180px at 85% 85%, 
              rgba(110, 231, 243, 0.04) 0%, 
              transparent 50%)`,
          }}
        />

        {/* Scrim for legibility */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            backgroundColor: 'rgba(28, 33, 48, 0.5)',
          }}
        />

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#ffb84d',
                boxShadow: '0 0 12px #ffb84d80',
              }}
            />
            <div className="font-bebas" style={{ fontSize: '18px', color: '#e6e9ef' }}>
              TYPOGRAPHY
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <div className="font-bebas" style={{ fontSize: '14px', color: '#e6e9ef' }}>
                NODE TYPE NAME
              </div>
              <div className="font-rama" style={{ fontSize: '10px', color: '#b5bdca', opacity: 0.6 }}>
                Bebas Neue Pro 14px
              </div>
            </div>

            <div>
              <div className="font-rama" style={{ fontSize: '14px', color: '#e6e9ef' }}>
                Interface Label
              </div>
              <div className="font-rama" style={{ fontSize: '10px', color: '#b5bdca', opacity: 0.6 }}>
                Rama Gothic Rounded 14px
              </div>
            </div>

            <div>
              <div className="font-jetbrains" style={{ fontSize: '13px', color: '#e6e9ef' }}>
                0.8542
              </div>
              <div className="font-rama" style={{ fontSize: '10px', color: '#b5bdca', opacity: 0.6 }}>
                JetBrains Mono 13px
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
