import { useState } from 'react';
import { ReadAloud } from '../../components/ReadAloud';
import { soundQuestions, spokenWords, type LetterSound, type SoundQuestion } from './sons';
import './sons.css';

const pick = <T,>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];

/**
 * Le son de la lettre (#50), dans « Pour le parent » : le son écrit, trois mots illustrés et
 * une question à poser (« Trouve un mot qui commence par… » ou « Qu'est-ce qui commence comme
 * maison ? »). La voix du téléphone dit les trois mots si elle est là ; sinon le parent les lit.
 */
export function LetterSoundBlock({ sound: s }: { sound: LetterSound }) {
  // Une question par manche, tirée au hasard.
  const [question] = useState<SoundQuestion>(() => pick(soundQuestions(s)));
  const [first, second] = s.words;
  // L'intrus tantôt avant, tantôt après : la bonne réponse n'est pas toujours la première.
  const [order] = useState(
    () => s.intrus && (Math.random() < 0.5 ? [second, s.intrus] : [s.intrus, second]),
  );

  return (
    <div className="letter-sound">
      <p>
        <strong>Le son :</strong>{' '}
        {s.silent ? (
          s.note
        ) : (
          <>
            « {s.sound} »{s.note && <> {s.note}</>}, comme au début de {first.word}
          </>
        )}
      </p>
      <ul className="letter-sound__words" aria-label="Mots du son">
        {s.words.map((x) => (
          <li key={x.word}>
            <span className="letter-sound__emoji" aria-hidden="true">
              {x.emoji}
            </span>
            {x.word}
          </li>
        ))}
      </ul>
      <p className="letter-sound__question">
        {question === 'like' && order ? (
          <>
            Demande : « Qu’est-ce qui commence comme <strong>{first.word}</strong> :{' '}
            {order[0].emoji} {order[0].word} ou {order[1].emoji} {order[1].word} ? » (réponse :{' '}
            {second.word})
          </>
        ) : s.silent ? (
          <>Demande : « Trouve un mot qui s’écrit avec un H au début. »</>
        ) : (
          <>Demande : « Trouve un mot qui commence par “{s.sound}”. »</>
        )}
      </p>
      {!s.silent && <ReadAloud text={spokenWords(s)} label="Écouter les mots" />}
    </div>
  );
}
