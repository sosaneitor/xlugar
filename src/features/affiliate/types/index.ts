/**
 * Affiliate link typing for the Chaturbate Revshare 20% program.
 * Tour IDs are program-specific landing destinations; track is the traffic
 * source label we attribute the click to (read in the affiliate dashboard).
 */

/** Named landing destinations -> Chaturbate `tour` IDs (campaign R1cGT). */
export type Tour =
  | 'home'
  | 'females'
  | 'couples'
  | 'trans'
  | 'males'
  | 'latinas'
  | 'top'
  | 'top_female'
  | 'register';

/** Where the click originated. Keep in sync with the analytics taxonomy. */
export type Track = 'home' | 'catalog' | 'blog' | 'ads';
