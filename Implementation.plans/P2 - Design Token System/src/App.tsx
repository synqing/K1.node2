import React, { useState } from 'react';
import { Check, Palette, Type, Layout, Sparkles, Smartphone, Mail, Search, Play } from 'lucide-react';
import { K1Button, K1Input, K1Card, K1Modal, K1ToastContainer, toast } from './components/k1';

export default function App() {
  const [showModal, setShowModal] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [buttonSuccess, setButtonSuccess] = useState(false);
  const [selectedCard, setSelectedCard] = useState<number | null>(null);

  const handleSubmit = async () => {
    setButtonLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setButtonLoading(false);
    setButtonSuccess(true);
    toast.success('Form submitted successfully!');
    
    setTimeout(() => {
      setButtonSuccess(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--k1-bg)', color: 'var(--k1-text)' }}>
      <K1ToastContainer />
      
      {/* Header */}
      <header 
        className="border-b"
        style={{ 
          borderColor: 'var(--k1-border)',
          backgroundColor: 'var(--k1-surface)',
          padding: 'var(--spacing-lg) var(--spacing-xl)'
        }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div 
              className="flex items-center justify-center"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--k1-accent)',
              }}
            >
              <Sparkles size={24} style={{ color: 'var(--k1-text-inverse)' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-bold)' }}>
                K1 Control Dashboard
              </h1>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--k1-text-secondary)' }}>
                Component States & Interactions v2.0
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto" style={{ padding: 'var(--spacing-3xl) var(--spacing-xl)' }}>
        {/* Hero Section */}
        <div className="text-center" style={{ marginBottom: 'var(--spacing-3xl)' }}>
          <div 
            className="inline-flex items-center gap-2"
            style={{
              padding: 'var(--spacing-xs) var(--spacing-md)',
              backgroundColor: 'var(--k1-success-bg)',
              color: 'var(--k1-success)',
              borderRadius: 'var(--radius-full)',
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--font-weight-semibold)',
              marginBottom: 'var(--spacing-lg)',
            }}
          >
            <Check size={14} />
            <span>Interactive States: Complete</span>
          </div>
          
          <h2 
            style={{ 
              fontSize: 'var(--text-display)', 
              fontWeight: 'var(--font-weight-bold)',
              lineHeight: 'var(--leading-display)',
              letterSpacing: 'var(--tracking-display)',
              marginBottom: 'var(--spacing-lg)',
            }}
          >
            Component States & Interactions
          </h2>
          
          <p 
            style={{ 
              fontSize: 'var(--text-lg)',
              color: 'var(--k1-text-secondary)',
              maxWidth: '700px',
              margin: '0 auto',
            }}
          >
            Complete interactive state system with hover, focus, active, disabled, loading, error, and success states. Platform-aware with iOS adaptations.
          </p>
        </div>

        {/* Interactive Demo Section */}
        <div style={{ marginBottom: 'var(--spacing-3xl)' }}>
          <h3 style={{ fontSize: 'var(--text-h2)', marginBottom: 'var(--spacing-lg)' }}>
            Interactive Components Demo
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Button States Demo */}
            <K1Card elevated>
              <h4 style={{ fontSize: 'var(--text-h4)', marginBottom: 'var(--spacing-md)' }}>
                Button States
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                <K1Button variant="primary" onClick={() => toast.info('Primary button clicked!')}>
                  Primary Button
                </K1Button>
                <K1Button variant="secondary" onClick={() => toast.info('Secondary button clicked!')}>
                  Secondary Button
                </K1Button>
                <K1Button variant="tertiary" onClick={() => toast.info('Tertiary button clicked!')}>
                  Tertiary Button
                </K1Button>
                <K1Button variant="primary" disabled>
                  Disabled Button
                </K1Button>
                <K1Button variant="primary" loading={buttonLoading} success={buttonSuccess} onClick={handleSubmit}>
                  {buttonSuccess ? 'Success!' : buttonLoading ? 'Loading...' : 'Submit Form'}
                </K1Button>
                <K1Button variant="primary" error onClick={() => toast.error('This is an error button')}>
                  Error Button
                </K1Button>
              </div>
            </K1Card>

            {/* Input States Demo */}
            <K1Card elevated>
              <h4 style={{ fontSize: 'var(--text-h4)', marginBottom: 'var(--spacing-md)' }}>
                Input States
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                <K1Input 
                  label="Email Address" 
                  placeholder="Enter your email"
                  icon={<Mail size={20} />}
                />
                <K1Input 
                  label="Search" 
                  placeholder="Search items..."
                  icon={<Search size={20} />}
                  helperText="Search by name or description"
                />
                <K1Input 
                  label="Required Field" 
                  placeholder="This field is required"
                  required
                  error="This field is required"
                />
                <K1Input 
                  label="Disabled Input" 
                  placeholder="Disabled state"
                  disabled
                />
              </div>
            </K1Card>
          </div>
        </div>

        {/* Interactive Cards Demo */}
        <div style={{ marginBottom: 'var(--spacing-3xl)' }}>
          <h3 style={{ fontSize: 'var(--text-h2)', marginBottom: 'var(--spacing-lg)' }}>
            Interactive Cards
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((num) => (
              <K1Card
                key={num}
                interactive
                selected={selectedCard === num}
                onClick={() => setSelectedCard(selectedCard === num ? null : num)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-sm)' }}>
                  <div 
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: selectedCard === num ? 'var(--k1-accent)' : 'var(--k1-surface-raised)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: selectedCard === num ? 'var(--k1-text-inverse)' : 'var(--k1-accent)',
                      transition: 'all var(--duration-normal) var(--ease-out)',
                    }}
                  >
                    <Play size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}>
                      Effect {num}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--k1-text-secondary)' }}>
                      {selectedCard === num ? 'Selected' : 'Click to select'}
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--k1-text-secondary)' }}>
                  Interactive card with hover, focus, and selected states.
                </p>
              </K1Card>
            ))}
          </div>
        </div>

        {/* Modal & Toast Demo */}
        <div style={{ marginBottom: 'var(--spacing-3xl)' }}>
          <h3 style={{ fontSize: 'var(--text-h2)', marginBottom: 'var(--spacing-lg)' }}>
            Dialogs & Notifications
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <K1Card elevated>
              <h4 style={{ fontSize: 'var(--text-h4)', marginBottom: 'var(--spacing-md)' }}>
                Modal Dialog
              </h4>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--k1-text-secondary)', marginBottom: 'var(--spacing-md)' }}>
                Animated modal with focus trap and keyboard navigation.
              </p>
              <K1Button onClick={() => setShowModal(true)}>
                Open Modal
              </K1Button>
            </K1Card>

            <K1Card elevated>
              <h4 style={{ fontSize: 'var(--text-h4)', marginBottom: 'var(--spacing-md)' }}>
                Toast Notifications
              </h4>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--k1-text-secondary)', marginBottom: 'var(--spacing-md)' }}>
                Slide-in notifications with auto-dismiss.
              </p>
              <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                <K1Button variant="secondary" size="sm" onClick={() => toast.success('Success!')}>
                  Success
                </K1Button>
                <K1Button variant="secondary" size="sm" onClick={() => toast.error('Error!')}>
                  Error
                </K1Button>
                <K1Button variant="secondary" size="sm" onClick={() => toast.warning('Warning!')}>
                  Warning
                </K1Button>
                <K1Button variant="secondary" size="sm" onClick={() => toast.info('Info!')}>
                  Info
                </K1Button>
              </div>
            </K1Card>
          </div>
        </div>

        {/* Modal */}
        <K1Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Example Modal"
          size="md"
        >
          <div>
            <p style={{ marginBottom: 'var(--spacing-md)', color: 'var(--k1-text-secondary)' }}>
              This is a modal dialog with focus trapping, keyboard navigation (Escape to close), 
              and entrance/exit animations.
            </p>
            <K1Input 
              label="Name"
              placeholder="Enter your name"
            />
            <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-lg)' }}>
              <K1Button variant="primary" onClick={() => setShowModal(false)}>
                Confirm
              </K1Button>
              <K1Button variant="secondary" onClick={() => setShowModal(false)}>
                Cancel
              </K1Button>
            </div>
          </div>
        </K1Modal>

        {/* Stats Grid */}
        <div 
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          style={{ marginBottom: 'var(--spacing-3xl)' }}
        >
          <StatCard 
            label="Color Tokens"
            value="50+"
            description="Complete palette with states"
            icon={<Palette />}
            color="var(--k1-accent)"
          />
          <StatCard 
            label="Typography Scales"
            value="10"
            description="Web + iOS variants"
            icon={<Type />}
            color="var(--k1-accent-2)"
          />
          <StatCard 
            label="Platform Support"
            value="2"
            description="Web & iOS native"
            icon={<Smartphone />}
            color="var(--k1-accent-warm)"
          />
        </div>

        {/* Features Grid */}
        <div 
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
          style={{ marginBottom: 'var(--spacing-3xl)' }}
        >
          <FeatureCard
            title="Color System"
            description="Complete color palette with accent colors, semantic colors, and port/wire types. All colors meet WCAG AA standards."
            items={[
              'Primary Accents: Cyan, Purple, Warm',
              'Status Colors: Success, Warning, Error, Info',
              'Interactive States: Hover, Pressed, Focus, Disabled',
              'Light/Dark Mode Support (iOS)',
            ]}
          />
          
          <FeatureCard
            title="Typography"
            description="Comprehensive type scale for web and iOS with platform-specific optimizations."
            items={[
              'Web Scale: Display → XSmall (10 scales)',
              'iOS Scale: SF Pro text styles',
              'Dynamic Type Support',
              'Monospace for Code',
            ]}
          />
          
          <FeatureCard
            title="Spacing & Layout"
            description="Consistent spacing system with touch-friendly sizing for all platforms."
            items={[
              'Spacing: 4px → 48px (7 scales)',
              'iOS Safe Area Support',
              '44px Touch Targets (iOS HIG)',
              'Responsive Breakpoints',
            ]}
          />
          
          <FeatureCard
            title="Shadows & Motion"
            description="Elevation system and animation tokens with accessibility support."
            items={[
              'Elevation: 0 → 5 (6 levels)',
              'Glow Effects for Focus States',
              'Animation Durations & Easing',
              'Reduced Motion Support',
            ]}
          />
        </div>

        {/* Documentation Links */}
        <div 
          className="p-8 rounded-lg"
          style={{ 
            backgroundColor: 'var(--k1-surface)',
            border: '1px solid var(--k1-border)',
          }}
        >
          <h3 style={{ fontSize: 'var(--text-h3)', marginBottom: 'var(--spacing-lg)' }}>
            Documentation
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DocLink
              title="Design Specification"
              description="Complete token reference with usage guidelines"
              file="/tokens/design-specification.md"
            />
            <DocLink
              title="Figma Tokens"
              description="Import-ready token set for Figma"
              file="/tokens/figma-tokens.json"
            />
            <DocLink
              title="iOS/SwiftUI Mapping"
              description="Native iOS implementation guide"
              file="/tokens/ios-swiftui-mapping.md"
            />
            <DocLink
              title="Platform Usage Guide"
              description="Web and iOS implementation examples"
              file="/tokens/platform-usage-guide.md"
            />
            <DocLink
              title="Accessibility Guide"
              description="WCAG compliance and testing"
              file="/tokens/accessibility-guide.md"
            />
            <DocLink
              title="CSS Variables"
              description="Complete token implementation"
              file="/styles/globals.css"
            />
          </div>
        </div>

        {/* Color Palette Preview */}
        <div style={{ marginTop: 'var(--spacing-3xl)' }}>
          <h3 style={{ fontSize: 'var(--text-h3)', marginBottom: 'var(--spacing-lg)' }}>
            Color Palette Preview
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ColorSwatch label="K1 Accent" color="var(--k1-accent)" />
            <ColorSwatch label="Accent 2" color="var(--k1-accent-2)" />
            <ColorSwatch label="Accent Warm" color="var(--k1-accent-warm)" />
            <ColorSwatch label="Success" color="var(--k1-success)" />
            <ColorSwatch label="Warning" color="var(--k1-warning)" />
            <ColorSwatch label="Error" color="var(--k1-error)" />
            <ColorSwatch label="Surface" color="var(--k1-surface)" />
            <ColorSwatch label="Surface Raised" color="var(--k1-surface-raised)" />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer 
        className="border-t text-center"
        style={{ 
          borderColor: 'var(--k1-border)',
          padding: 'var(--spacing-xl)',
          marginTop: 'var(--spacing-3xl)',
        }}
      >
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--k1-text-secondary)' }}>
          K1 Design Token System v2.0 • Platform-Aware • WCAG AAA Compliant
        </p>
      </footer>
    </div>
  );
}

function StatCard({ label, value, description, icon, color }: any) {
  return (
    <div 
      className="p-6 rounded-lg transition-all duration-[var(--duration-normal)]"
      style={{ 
        backgroundColor: 'var(--k1-surface)',
        border: '1px solid var(--k1-border)',
      }}
    >
      <div className="flex items-center gap-3" style={{ marginBottom: 'var(--spacing-md)' }}>
        <div 
          className="flex items-center justify-center"
          style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: `${color}20`,
            color: color,
          }}
        >
          {icon}
        </div>
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--k1-text-secondary)' }}>
          {label}
        </div>
      </div>
      <div style={{ fontSize: 'var(--text-display)', fontWeight: 'var(--font-weight-bold)' }}>
        {value}
      </div>
      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--k1-text-secondary)' }}>
        {description}
      </div>
    </div>
  );
}

function FeatureCard({ title, description, items }: any) {
  return (
    <div 
      className="p-6 rounded-lg"
      style={{ 
        backgroundColor: 'var(--k1-surface)',
        border: '1px solid var(--k1-border)',
      }}
    >
      <h4 style={{ fontSize: 'var(--text-h4)', marginBottom: 'var(--spacing-sm)' }}>
        {title}
      </h4>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--k1-text-secondary)', marginBottom: 'var(--spacing-md)' }}>
        {description}
      </p>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {items.map((item: string, index: number) => (
          <li 
            key={index}
            className="flex items-start gap-2"
            style={{ 
              fontSize: 'var(--text-sm)',
              marginBottom: 'var(--spacing-xs)',
            }}
          >
            <Check size={16} style={{ color: 'var(--k1-success)', flexShrink: 0, marginTop: '2px' }} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DocLink({ title, description, file }: any) {
  return (
    <a
      href={file}
      className="block p-4 rounded-lg transition-all duration-[var(--duration-normal)] hover:shadow-[var(--elevation-2)]"
      style={{ 
        backgroundColor: 'var(--k1-surface-raised)',
        border: '1px solid var(--k1-border)',
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <div style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--spacing-xs)' }}>
        {title}
      </div>
      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--k1-text-secondary)' }}>
        {description}
      </div>
      <div 
        className="inline-block"
        style={{ 
          fontSize: 'var(--text-xs)',
          color: 'var(--k1-accent)',
          marginTop: 'var(--spacing-xs)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        {file}
      </div>
    </a>
  );
}

function ColorSwatch({ label, color }: any) {
  return (
    <div className="flex flex-col gap-2">
      <div 
        className="rounded-lg"
        style={{ 
          width: '100%',
          height: '80px',
          backgroundColor: color,
          border: '1px solid var(--k1-border)',
        }}
      />
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--k1-text-secondary)', textAlign: 'center' }}>
        {label}
      </div>
    </div>
  );
}
