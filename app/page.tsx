import Surface from '@/components/pimlico-island/surface';
import definition from '@/data/pimlico-overlay-source.json';
import config from '@/data/pimlico-overlay.json';

export const metadata = { title: 'Pimlico, lifted from London · London Before' };

export default function Home() {
  return <Surface config={config} definition={definition} />;
}
