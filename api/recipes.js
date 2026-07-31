import { AuthError, getUserId } from '../lib/auth.js';
import { getRecipes, saveRecipes } from '../lib/recipeData.js';

function uid() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export default async function handler(req, res) {
  try {
    const userId = await getUserId(req);

    if (req.method === 'GET') {
      const recipes = await getRecipes(userId);
      return res.status(200).json(recipes);
    }

    if (req.method === 'POST') {
      // body: { name, items: [{name, grams}], calories, protein, fat, carbs, fiber, salt }
      const recipes = await getRecipes(userId);
      const newRecipe = { id: uid(), createdAt: new Date().toISOString(), ...req.body };
      await saveRecipes(userId, [...recipes, newRecipe]);
      return res.status(200).json(newRecipe);
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      const recipes = await getRecipes(userId);
      await saveRecipes(userId, recipes.filter((r) => r.id !== id));
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err instanceof AuthError) return res.status(401).json({ error: err.message });
    console.error(err);
    return res.status(500).json({ error: 'Internal error' });
  }
}