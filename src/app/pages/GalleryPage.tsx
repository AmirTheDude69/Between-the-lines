import { Link } from "react-router";
import { games } from "../data/games";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip";
import { InteractiveBackground } from "../components/InteractiveBackground";

export function GalleryPage() {
  return (
    <div className="min-h-screen p-4 md:p-8 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}>
      {/* Interactive Animated Background */}
      <InteractiveBackground variant="animated" />

      {/* Dotted Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
          backgroundSize: '30px 30px',
          zIndex: 2
        }}
      />

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-16 text-center relative" style={{ zIndex: 10 }}>
        
        
        <h1 
          className="text-7xl md:text-9xl font-bold mb-6 relative inline-block"
          style={{
            fontFamily: 'Courier New, monospace',
            color: '#FFD93D',
            textShadow: '5px 5px 0px #FF6B6B, 10px 10px 0px #4ECDC4, 15px 15px 0px #C77DFF',
            letterSpacing: '-0.02em'
          }}
        >
          Between
          <br />
          the Lines
        </h1>

        <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
          <div className="px-6 py-2 border-4 border-black bg-white transform -rotate-2">
            <p className="font-bold text-lg" style={{ fontFamily: 'Courier New, monospace' }}>
              {games.length} GAMES
            </p>
          </div>
          <div className="px-6 py-2 border-4 border-black bg-white transform rotate-2">
            <p className="font-bold text-lg" style={{ fontFamily: 'Courier New, monospace' }}>
              100+ QUESTIONS
            </p>
          </div>
          <div className="px-6 py-2 border-4 border-black bg-white transform -rotate-1">
            <p className="font-bold text-lg" style={{ fontFamily: 'Courier New, monospace' }}>
              ENDLESS FUN
            </p>
          </div>
        </div>
        
        <p 
          className="text-2xl mt-8 font-bold tracking-wide"
          style={{
            fontFamily: 'Courier New, monospace',
            color: '#fff',
            textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
          }}
        >
          ↓ Choose Your Adventure ↓
        </p>
      </div>

      {/* Game Cards Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 mb-16 relative" style={{ zIndex: 10 }}>
        {games.map((game, index) => (
          <Link
            key={game.id}
            to={`/game/${game.id}`}
            className="group"
            style={{
              animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both`
            }}
          >
            <div
              className="relative p-8 rounded-2xl transition-all duration-300 hover:scale-110 hover:-rotate-2 cursor-pointer border-[6px] h-[420px] flex flex-col"
              style={{
                backgroundColor: game.color,
                borderColor: '#000',
                boxShadow: '12px 12px 0px #000, 0 0 40px rgba(0,0,0,0.3)'
              }}
            >
              {/* Decorative Corner Elements */}
              <div className="absolute top-2 left-2 w-8 h-8 border-t-4 border-l-4 border-black" />
              <div className="absolute top-2 right-2 w-8 h-8 border-t-4 border-r-4 border-black" />
              <div className="absolute bottom-2 left-2 w-8 h-8 border-b-4 border-l-4 border-black" />
              <div className="absolute bottom-2 right-2 w-8 h-8 border-b-4 border-r-4 border-black" />

              {/* Pattern Overlay */}
              <div 
                className="absolute inset-0 opacity-10 rounded-2xl"
                style={{
                  backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 2px, transparent 0, transparent 50%)',
                  backgroundSize: '20px 20px'
                }}
              />

              {/* Game Number Badge */}
              <div 
                className="absolute -top-6 -left-6 w-16 h-16 rounded-full border-4 border-black flex items-center justify-center font-bold text-2xl transform -rotate-12 group-hover:rotate-0 transition-transform"
                style={{
                  backgroundColor: '#fff',
                  fontFamily: 'Courier New, monospace',
                  boxShadow: '4px 4px 0px #000'
                }}
              >
                #{index + 1}
              </div>

              {/* Rules Tooltip */}
              {game.rules && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className="absolute -top-4 -right-4 p-3 rounded-full transition-all border-4 border-black hover:scale-110 z-10"
                        style={{
                          backgroundColor: '#fff',
                          boxShadow: '4px 4px 0px #000'
                        }}
                        onClick={(e) => e.preventDefault()}
                      >
                        <Info size={24} color="#000" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      className="max-w-xs p-5 border-4"
                      style={{
                        backgroundColor: '#fff',
                        borderColor: '#000',
                        fontFamily: 'Courier New, monospace',
                        boxShadow: '6px 6px 0px #000'
                      }}
                    >
                      <p className="font-bold mb-3 text-lg">📖 How to Play:</p>
                      <p className="leading-relaxed">{game.rules}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* Content */}
              <div className="relative z-10 flex flex-col flex-1 min-h-0">
                {/* Game Name */}
                <h2
                  className="text-3xl font-bold mb-4 leading-tight"
                  style={{
                    fontFamily: 'Courier New, monospace',
                    color: '#000',
                    textShadow: '3px 3px 0px rgba(255,255,255,0.6)'
                  }}
                >
                  {game.name}
                </h2>

                {/* Decorative Divider */}
                <div className="w-full h-1 bg-black mb-4 relative">
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-black rotate-45" />
                </div>

                {/* Description */}
                <p
                  className="text-lg mb-6 leading-relaxed flex-1 overflow-y-auto"
                  style={{
                    fontFamily: 'Courier New, monospace',
                    color: '#000',
                    fontWeight: '600'
                  }}
                >
                  {game.description}
                </p>

                {/* Play Now Button */}
                <div
                  className="px-6 py-4 text-center font-bold border-4 transition-all relative overflow-hidden group-hover:bg-black group-hover:text-white group-hover:border-white"
                  style={{
                    fontFamily: 'Courier New, monospace',
                    backgroundColor: '#fff',
                    borderColor: '#000',
                    color: '#000',
                    fontSize: '1.25rem',
                    letterSpacing: '0.1em'
                  }}
                >
                  <span className="relative z-10">▶ PLAY NOW ◀</span>
                  <div className="absolute inset-0 bg-black transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Footer */}
      <div className="max-w-7xl mx-auto pt-12 pb-8 text-center border-t-4 border-dashed border-white/20 relative" style={{ zIndex: 10 }}>
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-16 h-1 bg-gradient-to-r from-transparent via-white to-transparent" />
          <div className="w-16 h-1 bg-gradient-to-r from-transparent via-white to-transparent" />
        </div>
        <p
          className="text-lg font-bold"
          style={{
            fontFamily: 'Courier New, monospace',
            color: '#fff',
            letterSpacing: '0.05em'
          }}
        >
          © 2026 Between the Lines
        </p>
        <p
          className="text-sm mt-2"
          style={{
            fontFamily: 'Courier New, monospace',
            color: '#fff',
            opacity: 0.6
          }}
        >
          Card Games for Real Connections
        </p>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
