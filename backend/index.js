import express from 'express';
import puppeteer from 'puppeteer';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from the root .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 8000;

// Global state
let browser = null;
let page = null;
let status = 'IDLE'; // IDLE, RUNNING, ERROR
let logs = [];
let isRunning = false;
let stats = {
  lessons: 0,
  xp: 0,
  startTime: null,
  errors: 0
};

const addLog = (level, message) => {
  const entry = {
    id: Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toLocaleTimeString(),
    level,
    message
  };
  logs.push(entry);
  if (level === 'error') stats.errors++;
  if (logs.length > 100) logs.shift();
  console.log(`[${level.toUpperCase()}] ${message}`);
};

// Helper to delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Main automation loop
const runAutomationLoop = async () => {
  if (!page) return;

  addLog('info', 'Démarrage de la boucle d\'automatisation...');

  while (isRunning) {
    try {
      if (page.isClosed()) {
        status = 'ERROR';
        addLog('error', 'Le navigateur a été fermé.');
        isRunning = false;
        break;
      }

      // 0. Speaking exercise page
      if (page.url().includes('/speaking/')) {
          const micBtn = await page.$('[data-testid="ex-record-animated-button"], [data-testid="ex-record-start-button"]');

          if (micBtn) {
              addLog('info', 'Exercice oral détecté. Tentative de passage (Skip)...');

              const skipped = await page.evaluate(() => {
                  const selectors = ['[data-testid="skip_button"]', '[data-qa="skip-button"]', '[data-qa="skip"]'];
                  for (const sel of selectors) {
                      const btn = document.querySelector(sel);
                      if (btn && btn.offsetParent !== null) { btn.click(); return true; }
                  }
                  const buttons = Array.from(document.querySelectorAll('button, a'));
                  const targetBtn = buttons.find(b => {
                      const text = b.textContent?.trim().toLowerCase();
                      return b.offsetParent !== null && (
                          text === 'passer' || 
                          text === 'skip' || 
                          text.includes('je ne peux pas parler') ||
                          text.includes('can\'t speak')
                      );
                  });
                  if (targetBtn) { targetBtn.click(); return true; }
                  return false;
              });

              if (skipped) {
                  addLog('success', 'Exercice oral ignoré via le bouton Passer.');
              } else {
                  addLog('warning', 'Bouton Passer introuvable, tentative du bouton Continuer...');
                  await page.evaluate(() => {
                      const buttons = Array.from(document.querySelectorAll('button'));
                      const btn = buttons.find(b => {
                          const t = b.textContent?.trim().toLowerCase();
                          return b.offsetParent !== null && (t === 'continuer' || t === 'continue');
                      });
                      if (btn) btn.click();
                  });
              }
              await delay(2000);
          }
          continue;
      }

      // 0. Dashboard / Timeline Logic
      if (page.url().includes('/dashboard/timeline')) {
          // addLog('info', 'Sur le tableau de bord. Recherche de leçons...');
          const lessonFound = await page.evaluate(() => {
              const cards = Array.from(document.querySelectorAll('[data-testid="lesson_card"]'));
              for (const card of cards) {
                  // Skip lessons that are oral or conversation based
                  const txt = (card.textContent || '').toLowerCase();
                  const skipKeywords = [
                      'conversation', 'entraînement oral', 'entrainement oral', 
                      'oral practice', 'ai conversation', 'prononciation', 
                      'pronunciation', 'expression orale', 'speaking', 'oral'
                  ];
                  if (skipKeywords.some(kw => txt.includes(kw))) {
                      continue;
                  }
                  const progressBar = card.querySelector('[role="progressbar"]');
                  if (progressBar) {
                      const progress = parseInt(progressBar.getAttribute('aria-valuenow') || '0');
                      if (progress < 100) {
                          // Found incomplete lesson
                          // Click the card itself or a clickable child if needed. 
                          // The user said "clique dessus" (on the card).
                          card.click();
                          return true;
                      }
                  }
              }
              return false;
          });

          if (lessonFound) {
              addLog('success', 'Leçon incomplète trouvée. Ouverture...');
              await delay(1500);
              
              // Click "Let's go!" popup
              const startBtn = await page.$('[data-testid="pop-up-card-cta"]');
              if (startBtn) {
                  addLog('success', 'Bouton "Let\'s go!" cliqué.');
                  await startBtn.click();
                  await delay(4000); // Wait for lesson load
              }
              continue;
          }
      }

      // 1. Check for "Continue" button (generic)
      // Busuu often has a "Continue" button with specific classes or text.
      // We'll look for common selectors.
      const continueButton = await page.$('button[data-qa="continue-button"]'); // Example selector, need to be generic if possible
      // Or look for text "Continue"
      
      // 0.0 Check for Keyboard Shortcuts Modal
      const shortcutsModal = await page.$('.modal-shortcut__title');
      if (shortcutsModal) {
          addLog('info', 'Modal Raccourcis Clavier détecté. Fermeture...');
          const closeBtn = await page.$('.react-modal__icon-close');
          if (closeBtn) {
              await closeBtn.click();
          } else {
              await page.keyboard.press('Escape');
          }
          await delay(1000);
          continue;
      }

      // 0.0.1 Check for Friend Recommendation Modal
      const friendRecModal = await page.$('.friend-recommendation-onboarding');
      if (friendRecModal) {
          addLog('info', 'Modal Recommandation d\'amis détecté. Fermeture...');
          const noThanksBtn = await page.$('[data-qa-cancel-friend-recommendation-flow="true"]');
          if (noThanksBtn) {
              await noThanksBtn.click();
          } else {
              const closeBtn = await page.$('.react-modal__icon-close');
              if (closeBtn) await closeBtn.click();
              else await page.keyboard.press('Escape');
          }
          await delay(1000);
          continue;
      }

      // 0. Check for Lesson Finished
      const lessonFinishedBtn = await page.$('[data-qa-lesson-finished]');
      if (lessonFinishedBtn) {
          addLog('success', 'Leçon terminée détectée. Clic sur Continuer...');
          stats.lessons++;
          stats.xp += 15; // Approximate XP per lesson
          await lessonFinishedBtn.click();
          await delay(3000);
          continue;
      }

      // 0.1 Check for League Promotion
      const leaguePromotionBtn = await page.$('[data-qa-league-promotion]');
      if (leaguePromotionBtn) {
          addLog('success', 'Promotion de ligue détectée. Clic sur Continuer...');
          await leaguePromotionBtn.click();
          await delay(3000);
          continue;
      }

      // 0.2 Check for Daily Challenges
      const dailyChallengesBtn = await page.$('[data-qa-daily-challenges]');
      if (dailyChallengesBtn) {
          addLog('success', 'Défis quotidiens détectés. Clic sur Continuer...');
          await dailyChallengesBtn.click();
          await delay(3000);
          continue;
      }

      // 0.3 Check for League
      const leagueBtn = await page.$('[data-qa-league]');
      if (leagueBtn) {
          addLog('success', 'Ligue détectée. Clic sur Continuer...');
          await leagueBtn.click();
          await delay(3000);
          continue;
      }

      // 0.4 Check for Streak
      const streakBtn = await page.$('[data-qa-streak]');
      if (streakBtn) {
          addLog('success', 'Streak détecté. Clic sur Continuer...');
          await streakBtn.click();
          await delay(3000);
          continue;
      }

      // 0.5 Check for Streak Calculator
      const streakCalcBtn = await page.$('[data-qa-streak-calculator]');
      if (streakCalcBtn) {
          addLog('success', 'Calculateur de Streak détecté. Clic sur Continuer...');
          await streakCalcBtn.click();
          await delay(3000);
          continue;
      }

      // 0.6 Check for Streak Goal
      const streakGoalBtn = await page.$('[data-qa-streak-goal]');
      if (streakGoalBtn) {
          addLog('success', 'Objectif de Streak détecté. Clic sur Continuer...');
          await streakGoalBtn.click();
          await delay(3000);
          continue;
      }

      // 0.7 Check for Shields
      const shieldsBtn = await page.$('[data-qa-shields]');
      if (shieldsBtn) {
          addLog('success', 'Boucliers détectés. Clic sur Equip shields...');
          await shieldsBtn.click();
          await delay(3000);
          continue;
      }

      // 0.8 Microphone button inside a regular lesson
      const micBtn = await page.$('[data-testid="ex-record-animated-button"]');
      if (micBtn) {
          addLog('info', 'Exercice oral détecté. Recherche du bouton Passer...');
          
          const skipped = await page.evaluate(() => {
              const selectors = [
                  '[data-testid="skip_button"]',
                  '[data-qa="skip-button"]',
                  '[data-qa="skip"]'
              ];
              for (const sel of selectors) {
                  const btn = document.querySelector(sel);
                  if (btn && btn.offsetParent !== null) {
                      btn.click();
                      return true;
                  }
              }
              const buttons = Array.from(document.querySelectorAll('button, a'));
              const targetBtn = buttons.find(b => {
                  const text = b.textContent?.trim().toLowerCase();
                  return b.offsetParent !== null && (
                      text === 'passer' || 
                      text === 'skip' || 
                      text.includes('je ne peux pas parler') ||
                      text.includes('can\'t speak')
                  );
              });
              if (targetBtn) {
                  targetBtn.click();
                  return true;
              }
              return false;
          });

          if (skipped) {
              addLog('success', 'Exercice oral ignoré via le bouton Passer.');
          } else {
              addLog('warning', 'Bouton Passer introuvable, clic sur Continuer par défaut...');
              await page.evaluate(() => {
                  const buttons = Array.from(document.querySelectorAll('button'));
                  const btn = buttons.find(b => {
                      const text = b.textContent?.trim().toLowerCase();
                      return b.offsetParent !== null && (text === 'continuer' || text === 'continue');
                  });
                  if (btn) btn.click();
              });
          }
          await delay(2000);
          continue;
      }
      // 0.9 Check for Post Lesson Progress Bar
      const postLessonClicked = await page.evaluate(() => {
          const span = document.querySelector('span[data-testid="postlessonprogressbar"]');
          if (span && (span.textContent.trim() === 'Continue' || span.textContent.trim() === 'Continuer')) {
              span.click();
              return true;
          }
          return false;
      });
      if (postLessonClicked) {
          addLog('success', 'Fin de leçon (progressbar) détectée. Clic sur Continuer...');
          await delay(3000);
          continue;
      }

      // 0.10 Check for Writing/Feedback Exercise
      const isCommunityExercise = await page.evaluate(() => {
          // Check for "Write" / "Speak" buttons
          const btns = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
          const writeBtn = btns.find(b => {
              const t = (b.textContent || '').trim().toLowerCase();
              return b.offsetParent !== null && !b.disabled && (
                  t === 'write' || t === 'écrire' || 
                  b.getAttribute('data-testid') === 'writing-button' ||
                  (b.querySelector('svg') && (b.innerHTML.includes('edit') || b.innerHTML.includes('pen') || b.innerHTML.includes('writ')))
              );
          });
          if (writeBtn) {
              writeBtn.click();
              return 'SWITCHED';
          }

          // Check if we are already in the writing textarea screen
          const textareas = Array.from(document.querySelectorAll('textarea'));
          const isWritingScreen = textareas.some(ta => ta.offsetParent !== null) && 
              document.body.innerText.match(/reste\s+(\d+)\s+mots?|(\d+)\s+words?\s+left/i);
          
          if (isWritingScreen) return 'WRITING_SCREEN';
          return null;
      });

      if (isCommunityExercise === 'SWITCHED') {
          addLog('success', 'Exercice de communauté détecté. Clic sur Write (écrire)...');
          await delay(2000);
          continue;
      } else if (isCommunityExercise === 'WRITING_SCREEN') {
          addLog('info', 'Écran d\'écriture de la communauté détecté. Saisie du texte...');
          
          const textAreaSelector = 'textarea';
          
          const baseText = "I am learning a lot and enjoying the lessons very much, I really like this language and I practice it every day with friends and family because it is fun and useful for travel and work.";
          let answerText = baseText;
          
          const fillText = async (txt) => {
              try {
                  await page.evaluate((sel) => { 
                      const el = document.querySelector(sel); 
                      if(el){ 
                          el.focus(); 
                          el.value=''; 
                          el.dispatchEvent(new Event('input',{bubbles:true})); 
                      } 
                  }, textAreaSelector);
                  await page.type(textAreaSelector, txt);
              } catch(e) {
                  await page.evaluate((sel, t) => {
                      const el = document.querySelector(sel);
                      if(el) { el.value = t; el.dispatchEvent(new Event('input', { bubbles: true })); }
                  }, textAreaSelector, txt);
              }
          };

          await fillText(answerText);
          await delay(800);

          const getRemaining = async () => {
              return await page.evaluate(() => {
                  const m = document.body.innerText.match(/reste\s+(\d+)\s+mots?|(\d+)\s+words?\s+left/i);
                  if (!m) return 0;
                  return parseInt(m[1] || m[2] || '0', 10);
              });
          };

          let safety = 8;
          while (safety-- > 0) {
              const remaining = await getRemaining();
              if (!remaining || remaining <= 0) break;
              addLog('info', `Il manque ${remaining} mots, ajout...`);
              const extra = Array(remaining + 2).fill('language').join(' ');
              answerText = answerText + ' ' + extra;
              await fillText(answerText);
              await delay(600);
          }
          await delay(500);

          // Click Send
          await page.evaluate(() => {
              const sendQa = document.querySelector('[data-qa-send-community], [data-qa="send-community"]');
              if (sendQa && sendQa.offsetParent !== null && !sendQa.disabled) {
                  sendQa.click();
                  return;
              }
              const buttons = Array.from(document.querySelectorAll('button'));
              const sendBtn = buttons.find(b => {
                  const t = (b.textContent || '').toLowerCase();
                  const dataQa = (b.getAttribute('data-qa') || '').toLowerCase();
                  return b.offsetParent !== null && !b.disabled && (
                      t.includes('envoyer') || t.includes('send') || dataQa.includes('send')
                  );
              });
              if (sendBtn) sendBtn.click();
          });
          
          addLog('success', 'Exercice de communauté envoyé !');
          await delay(3000);
          continue;
      }

      // User logic 1: Check for data-qa-pass (Sequence OR Single Correct)
      const passAction = await page.evaluate(() => {
          const els = Array.from(document.querySelectorAll('[data-qa-pass]'));
          if (els.length === 0) return null;

          // Check for typing input
          const inputEl = els.find(el => el.tagName === 'INPUT');
          if (inputEl) {
             return {
                 type: 'typing',
                 selector: 'input[data-qa-pass]',
                 value: inputEl.getAttribute('data-qa-pass')
             };
          }

          // Check for "true" values (Multi-select or Single select)
          const trueEls = els.filter(el => el.getAttribute('data-qa-pass') === 'true');
          if (trueEls.length > 0) {
              // Assign unique IDs to handle multiple correct answers
              trueEls.forEach((el, index) => el.setAttribute('data-bot-pass-true-id', index.toString()));
              return {
                  type: 'choice',
                  items: trueEls.map((el, index) => `[data-bot-pass-true-id="${index}"]`)
              };
          }

          // Check if it looks like a numeric sequence (0, 1, 2...)
          const isSequence = els.every(el => {
              const val = el.getAttribute('data-qa-pass');
              return val && !isNaN(parseInt(val));
          });

          if (isSequence) {
              // Assign unique IDs to handle duplicates (e.g. multiple items with "0")
              els.forEach((el, index) => {
                  el.setAttribute('data-bot-unique-id', index.toString());
              });

              return {
                  type: 'sequence',
                  items: els.map((el, index) => ({
                      val: parseInt(el.getAttribute('data-qa-pass')),
                      selector: `[data-bot-unique-id="${index}"]`
                  })).sort((a, b) => a.val - b.val)
              };
          } else {
              // Single correct answer (e.g. data-qa-pass="true")
              // Find the one marked as true
              const correctEl = els.find(el => el.getAttribute('data-qa-pass') === 'true');
              if (correctEl) {
                  return { type: 'single', selector: '[data-qa-pass="true"]' };
              }
              // Fallback: just pick the first one if we can't determine
              return { type: 'single', selector: '[data-qa-pass]' };
          }
      });

      if (passAction) {
          if (passAction.type === 'choice') {
              addLog('success', `Choix multiples détectés (${passAction.items.length}). Sélection de toutes les réponses correctes...`);
              for (const selector of passAction.items) {
                  try {
                      await page.click(selector);
                  } catch (e) {
                      await page.evaluate((sel) => document.querySelector(sel)?.click(), selector);
                  }
                  await delay(500);
              }
              // Click continue
              await page.evaluate(() => {
                  const selectors = ['[data-testid="check_button"]', '[data-qa-feedback-cta]', '[data-qa="continue-button"]', '[data-qa-feedback-positive]'];
                  for (const sel of selectors) {
                      const btn = document.querySelector(sel);
                      if (btn && !btn.disabled && !btn.getAttribute('disabled')) { btn.click(); return; }
                  }
                  const buttons = Array.from(document.querySelectorAll('button'));
                  const targetBtn = buttons.find(b => {
                      const text = b.textContent?.trim().toLowerCase();
                      return !b.disabled && (text === 'continue' || text === 'continuer');
                  });
                  if (targetBtn) targetBtn.click();
              });
              stats.xp += 5;
              await delay(2000);
              continue;

          } else if (passAction.type === 'sequence') {
              addLog('info', `Séquence détectée (${passAction.items.length} éléments). Saisie de la phrase complète...`);
              
              const startUrl = page.url();
              
              // Click ALL items in the sequence
              for (let i = 0; i < passAction.items.length; i++) {
                  // Verify URL hasn't changed
                  if (page.url() !== startUrl) {
                      addLog('info', 'URL changée pendant la séquence. Arrêt.');
                      break;
                  }

                  const item = passAction.items[i];
                  try {
                      await page.click(item.selector);
                  } catch (e) {
                      await page.evaluate((sel) => document.querySelector(sel)?.click(), item.selector);
                  }
                  await delay(600); 
              }
              
              // Only click continue AFTER entering the full sequence
              if (page.url() === startUrl) {
                  addLog('info', 'Séquence terminée. Validation...');
                  await page.evaluate(() => {
                      const selectors = ['[data-testid="check_button"]', '[data-qa-feedback-cta]', '[data-qa="continue-button"]', '[data-qa-feedback-positive]'];
                      for (const sel of selectors) {
                          const btn = document.querySelector(sel);
                          if (btn && !btn.disabled && !btn.getAttribute('disabled') && btn.offsetParent !== null) {
                              btn.click(); return;
                          }
                      }
                      // Fallback
                      const buttons = Array.from(document.querySelectorAll('button'));
                      const targetBtn = buttons.find(b => {
                          const text = b.textContent?.trim().toLowerCase();
                          return b.offsetParent !== null && !b.disabled && (text === 'continue' || text === 'continuer');
                      });
                      if (targetBtn) { targetBtn.click(); }
                  });
                  
                  // Wait for transition
                  let attempts = 0;
                  while(page.url() === startUrl && attempts < 50) {
                      await delay(100);
                      attempts++;
                  }
              }
              stats.xp += 5;
              continue;

          } else if (passAction.type === 'single') {
              // This block is now largely redundant because 'choice' handles single 'true' items too,
              // but we keep it as a fallback for other potential single-answer types not caught by 'true'.
              addLog('success', 'Réponse unique data-qa-pass détectée. Clic...');
              try {
                  await page.click(passAction.selector);
              } catch (e) {
                  await page.evaluate((sel) => document.querySelector(sel)?.click(), passAction.selector);
              }
              await delay(1000);
              
              // Click continue
              await page.evaluate(() => {
                  const selectors = ['[data-testid="check_button"]', '[data-qa-feedback-cta]', '[data-qa="continue-button"]', '[data-qa-feedback-positive]'];
                  for (const sel of selectors) {
                      const btn = document.querySelector(sel);
                      if (btn && !btn.disabled && !btn.getAttribute('disabled')) { btn.click(); return; }
                  }
                  const buttons = Array.from(document.querySelectorAll('button'));
                  const targetBtn = buttons.find(b => {
                      const text = b.textContent?.trim().toLowerCase();
                      return !b.disabled && (text === 'continue' || text === 'continuer');
                  });
                  if (targetBtn) targetBtn.click();
              });
              addLog('info', 'Tentative de clic sur Continuer.');
              stats.xp += 5;
              await delay(2000);
              continue;

          } else if (passAction.type === 'typing') {
              addLog('info', `Champ de saisie détecté. Réponse: "${passAction.value}"`);
              try {
                  await page.type(passAction.selector, passAction.value);
              } catch (e) {
                  // Fallback: set value directly if typing fails
                  await page.evaluate((sel, val) => {
                      const el = document.querySelector(sel);
                      if (el) { el.value = val; el.dispatchEvent(new Event('input', { bubbles: true })); }
                  }, passAction.selector, passAction.value);
              }
              await delay(800);
              
              // Click continue
              await page.evaluate(() => {
                  const selectors = ['[data-testid="check_button"]', '[data-qa-feedback-cta]', '[data-qa="continue-button"]', '[data-qa-feedback-positive]'];
                  for (const sel of selectors) {
                      const btn = document.querySelector(sel);
                      if (btn && !btn.disabled && !btn.getAttribute('disabled')) { btn.click(); return; }
                  }
                  const buttons = Array.from(document.querySelectorAll('button'));
                  const targetBtn = buttons.find(b => {
                      const text = b.textContent?.trim().toLowerCase();
                      return !b.disabled && (text === 'continue' || text === 'continuer');
                  });
                  if (targetBtn) targetBtn.click();
              });
              stats.xp += 5;
              await delay(2000);
              continue;
          }
      }
      // User logic 2: Check for values "0", "1", "2"
      // "si il y a des valeurs "0" "1" "2" selectionne les dans l'ordre"
      // We assume these are elements with some attribute or text.
      // Let's try to find elements with text "0", "1", "2" that are clickable?
      // Or maybe data-value="0"?
      // I'll try a few strategies.
      
      // Strategy: Look for elements that might be these values.
      // Assuming they are part of a reordering exercise.
      // const val0 = await page.$('[data-value="0"], [data-test="0"], div:contains("0")'); // REMOVED: Invalid selector
      
      // Using evaluate to find elements by text or attribute more flexibly
      const foundSequence = await page.evaluate(() => {
        const findEl = (val) => {
            // Try data-value
            let el = document.querySelector(`[data-value="${val}"]`);
            if (el) return el;
            // Try text content exact match in buttons or divs that look like options
            const allDivs = Array.from(document.querySelectorAll('div, button, span'));
            return allDivs.find(e => e.textContent?.trim() === val && e.offsetParent !== null); // visible
        };
        return !!(findEl("0") && findEl("1") && findEl("2"));
      });

      if (foundSequence) {
        addLog('info', 'Séquence 0, 1, 2 détectée. Sélection dans l\'ordre...');
        
        // Click 0
        await page.evaluate(() => {
            const findEl = (val) => {
                let el = document.querySelector(`[data-value="${val}"]`);
                if (el) return el;
                const allDivs = Array.from(document.querySelectorAll('div, button, span'));
                return allDivs.find(e => e.textContent?.trim() === val && e.offsetParent !== null);
            };
            findEl("0")?.click();
        });
        await delay(500);

        // Click 1
        await page.evaluate(() => {
            const findEl = (val) => {
                let el = document.querySelector(`[data-value="${val}"]`);
                if (el) return el;
                const allDivs = Array.from(document.querySelectorAll('div, button, span'));
                return allDivs.find(e => e.textContent?.trim() === val && e.offsetParent !== null);
            };
            findEl("1")?.click();
        });
        await delay(500);

        // Click 2
        await page.evaluate(() => {
            const findEl = (val) => {
                let el = document.querySelector(`[data-value="${val}"]`);
                if (el) return el;
                const allDivs = Array.from(document.querySelectorAll('div, button, span'));
                return allDivs.find(e => e.textContent?.trim() === val && e.offsetParent !== null);
            };
            findEl("2")?.click();
        });
        await delay(1000);

        // Click continue
        await page.evaluate(() => {
            const selectors = [
                '[data-testid="check_button"]',
                '[data-qa-feedback-cta]',
                '[data-qa="continue-button"]',
                '[data-qa-feedback-positive]'
            ];
            for (const sel of selectors) {
                const btn = document.querySelector(sel);
                if (btn && !btn.disabled && !btn.getAttribute('disabled')) {
                    btn.click();
                    return;
                }
            }
            // Fallback text
            const buttons = Array.from(document.querySelectorAll('button'));
            const targetBtn = buttons.find(b => {
                const text = b.textContent?.trim().toLowerCase();
                return (text === 'continue' || text === 'continuer') && !b.disabled;
            });
            if (targetBtn) targetBtn.click();
        });
        addLog('info', 'Tentative de clic sur Continuer.');
        await delay(2000);
        continue;
      }

      // User logic 3: Just continue button
      // "si jamais il y a juste le bouton continue alors clique dessus directement"
      // We check if there's a continue button visible and enabled.
      
      // Updated selector based on user input
      // <button loading="false" class="..." data-testid="check_button" data-qa-feedback-cta="" ...>Continue</button>
      
      const continueClicked = await page.evaluate(() => {
          const selectors = [
              '[data-testid="check_button"]',
              '[data-qa-feedback-cta]',
              '[data-qa="continue-button"]',
              '[data-qa-feedback-positive]'
          ];
          
          for (const sel of selectors) {
              const btn = document.querySelector(sel);
              if (btn && !btn.disabled && !btn.getAttribute('disabled') && btn.offsetParent !== null) { // visible
                  btn.click();
                  return true;
              }
          }
          
          // Fallback by text for "Continue" or "Next Lesson"
          const buttons = Array.from(document.querySelectorAll('button'));
          const targetBtn = buttons.find(b => {
              const text = b.textContent?.trim().toLowerCase();
              const isVisible = b.offsetParent !== null;
              const isEnabled = !b.disabled && !b.getAttribute('disabled');
              return isVisible && isEnabled && (
                  text === 'continue' || 
                  text === 'continuer' || 
                  text === 'next lesson' || 
                  text === 'leçon suivante' ||
                  text === 'start quiz' ||
                  text === 'commencer le quiz'
              );
          });
          
          if (targetBtn) {
              targetBtn.click();
              return true;
          }
          
          return false;
      });

      if (continueClicked) {
          addLog('info', 'Bouton Continuer/Suivant détecté et cliqué.');
          await delay(2000);
          continue;
      }

      // If we are here, maybe we need to solve a question using LLM?
      // Or maybe we just wait.
      // For now, let's just wait a bit to avoid tight loop
      await delay(1000);

    } catch (error) {
      addLog('error', `Erreur dans la boucle: ${error.message}`);
      await delay(2000);
    }
  }
};

// Routes
app.get('/status', (req, res) => {
  res.json({ status, logs, stats });
});

app.post('/launch', async (req, res) => {
  if (browser) {
    return res.json({ message: 'Navigateur déjà ouvert' });
  }

  try {
    status = 'WAITING_FOR_USER';
    addLog('info', 'Lancement du navigateur...');
    
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: ['--start-maximized']
    });

    page = await browser.newPage();
    
    addLog('info', 'Navigation vers Busuu...');
    await page.goto('https://www.busuu.com/fr/login', { waitUntil: 'networkidle2' });

    // Auto-login if credentials exist
    const email = process.env.BUSUU_EMAIL;
    const password = process.env.BUSUU_PASSWORD;

    if (email && password) {
        addLog('info', 'Tentative de connexion automatique...');
        try {
            await page.waitForSelector('input[name="login-form-email"]', { timeout: 5000 });
            await page.type('input[name="login-form-email"]', email);
            await page.type('input[name="login-form-password"]', password);
            await delay(500);
            
            await page.click('#login-form-submit');
            addLog('success', 'Identifiants soumis. Connexion en cours...');
            
            // Wait for navigation to dashboard or similar
            try {
                await page.waitForNavigation({ timeout: 10000, waitUntil: 'domcontentloaded' });
                addLog('success', 'Connexion réussie (probable).');
            } catch (e) {
                addLog('warning', 'Navigation après connexion lente ou manuelle requise.');
            }
        } catch (e) {
            addLog('error', `Erreur lors de la connexion auto: ${e.message}`);
        }
    } else {
        addLog('info', 'En attente de la connexion manuelle de l\'utilisateur (pas d\'identifiants dans .env)...');
    }

    res.json({ success: true });
  } catch (error) {
    status = 'ERROR';
    addLog('error', `Erreur de lancement: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

app.post('/start_solving', async (req, res) => {
  if (!browser || !page) {
    return res.status(400).json({ error: 'Navigateur non lancé. Utilisez /launch d\'abord.' });
  }
  
  if (isRunning) {
    return res.json({ message: 'Déjà en cours d\'exécution' });
  }

  const { autoNavigation } = req.body;
  addLog('info', `Démarrage du bot (Auto Navigation: ${autoNavigation ? 'ON' : 'OFF'})...`);
  
  status = 'RUNNING';
  isRunning = true;
  
  // Reset stats for new session if needed, or keep them?
  // User probably wants session stats. Let's reset if it was IDLE.
  if (!stats.startTime) {
      stats.startTime = Date.now();
      stats.lessons = 0;
      stats.xp = 0;
      stats.errors = 0;
  }
  
  runAutomationLoop(autoNavigation); // Pass config if needed
  
  res.json({ success: true });
});

app.post('/stop', async (req, res) => {
  isRunning = false;
  status = 'WAITING_FOR_USER'; // Go back to waiting state, don't close browser
  addLog('warning', 'Pause du bot.');
  res.json({ success: true });
});

app.post('/close', async (req, res) => {
  isRunning = false;
  if (browser) {
    await browser.close();
    browser = null;
    page = null;
  }
  status = 'IDLE';
  addLog('warning', 'Fermeture du navigateur.');
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
