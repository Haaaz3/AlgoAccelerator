/**
 * ChessPuzzleGate
 *
 * A chess puzzle that gates access to the app.
 * Users must attempt a ~1000 ELO puzzle to enter.
 * Wrong answers still grant access but with a shame banner.
 */

import { useState, useCallback } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { getRandomPuzzle } from '../../data/chessPuzzles';
import { Crown, Lightbulb, RotateCcw, ArrowRight, CheckCircle, XCircle } from 'lucide-react';

export function ChessPuzzleGate({ onComplete }) {
  // Pick a random puzzle on mount (use useState to ensure it's stable)
  const [puzzle] = useState(() => getRandomPuzzle());

  // Track the current position FEN (start with puzzle position)
  const [currentFen, setCurrentFen] = useState(() => puzzle.fen);

  const [attempted, setAttempted] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [moveSquares, setMoveSquares] = useState({});

  // Determine whose turn it is from FEN
  const playerColor = puzzle.fen.includes(' w ') ? 'white' : 'black';

  // Handle piece drop - v5 API uses object with piece, sourceSquare, targetSquare
  const onDrop = useCallback(({ sourceSquare, targetSquare }) => {
    if (attempted) return false;

    // Create a fresh game from current position to validate move
    const gameCopy = new Chess(currentFen);
    let move;
    try {
      move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q', // Always promote to queen for simplicity
      });
    } catch {
      return false;
    }

    if (!move) return false;

    // Check if this matches the solution
    const playerMove = sourceSquare + targetSquare;
    const isCorrect = puzzle.solution.startsWith(playerMove);

    setCurrentFen(gameCopy.fen());
    setAttempted(true);
    setCorrect(isCorrect);

    // Highlight the move
    setMoveSquares({
      [sourceSquare]: { backgroundColor: isCorrect ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)' },
      [targetSquare]: { backgroundColor: isCorrect ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)' },
    });

    return true;
  }, [currentFen, puzzle.solution, attempted]);

  // Reset puzzle
  const handleReset = () => {
    setCurrentFen(puzzle.fen);
    setAttempted(false);
    setCorrect(false);
    setShowHint(false);
    setMoveSquares({});
  };

  // Enter app
  const handleEnter = () => {
    onComplete(correct);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Crown className="w-8 h-8 text-amber-400" />
            <h1 className="text-2xl font-bold text-white">Prove Your Worth</h1>
          </div>
          <p className="text-slate-400 text-sm">
            Solve this chess puzzle to enter. You have one attempt.
          </p>
          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 border border-amber-500/30 rounded-full">
            <span className="text-amber-300 font-semibold text-sm">
              {puzzle.goal}
            </span>
            <span className="text-slate-400 text-xs">
              ({playerColor === 'white' ? 'White' : 'Black'} to move)
            </span>
          </div>
        </div>

        {/* Chess Board - v5 API with options object */}
        <div className="bg-slate-800 rounded-xl p-4 shadow-2xl border border-slate-700">
          <Chessboard
            options={{
              id: `puzzle-${puzzle.id}`,
              position: currentFen,
              boardOrientation: playerColor,
              squareStyles: moveSquares,
              allowDragging: !attempted,
              boardStyle: {
                borderRadius: '8px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
              },
              darkSquareStyle: { backgroundColor: '#4a5568' },
              lightSquareStyle: { backgroundColor: '#718096' },
              onPieceDrop: onDrop,
            }}
          />
        </div>

        {/* Puzzle Info */}
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-mono">
            Puzzle #{puzzle.id}
          </span>

          {!attempted && (
            <button
              onClick={() => setShowHint(!showHint)}
              className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors"
            >
              <Lightbulb size={14} />
              {showHint ? 'Hide Hint' : 'Show Hint'}
            </button>
          )}
        </div>

        {/* Hint */}
        {showHint && !attempted && (
          <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <p className="text-sm text-amber-300 italic">{puzzle.hint}</p>
          </div>
        )}

        {/* Result */}
        {attempted && (
          <div className={`
            mt-4 p-4 rounded-lg border
            ${correct
              ? 'bg-green-500/10 border-green-500/30'
              : 'bg-red-500/10 border-red-500/30'
            }
          `}>
            <div className="flex items-start gap-3">
              {correct ? (
                <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
              ) : (
                <XCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
              )}
              <div>
                <h3 className={`font-semibold ${correct ? 'text-green-400' : 'text-red-400'}`}>
                  {correct ? 'Correct!' : 'Incorrect'}
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  {correct
                    ? 'Well played. You may enter.'
                    : 'That was not the best move. The solution was ' +
                      puzzle.solution.slice(0, 2) + '-' + puzzle.solution.slice(2, 4) +
                      '. You may still enter, but we\'ll remember this.'
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          {attempted ? (
            <button
              onClick={handleEnter}
              className={`
                flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all
                ${correct
                  ? 'bg-green-600 hover:bg-green-500 text-white'
                  : 'bg-red-600/80 hover:bg-red-500 text-white'
                }
              `}
            >
              Enter App
              <ArrowRight size={18} />
            </button>
          ) : (
            <button
              onClick={handleReset}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
            >
              <RotateCcw size={16} />
              Reset Position
            </button>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-slate-600 text-xs mt-6">
          ~1000 ELO Puzzle
        </p>
      </div>
    </div>
  );
}

export default ChessPuzzleGate;
