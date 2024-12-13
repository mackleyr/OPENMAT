import { supabase } from '../supabaseClient';

export const createDeal = async (dealData) => {
  const { title, description, imageUrl, dealType, value, deposit, expirationDate, userId } = dealData;

  const { data: deal, error: dealError } = await supabase
    .from('deals')
    .insert([
      {
        title,
        description,
        image_url: imageUrl,
        deal_type: dealType,
        value,
        deposit,
        expiration_date: expirationDate,
        creator_id: userId,
      },
    ])
    .select()
    .single();

  if (dealError) throw dealError;

  return deal;
};

export const generateShareLink = async (dealId, userId) => {
  const uniqueUrl = crypto.randomUUID(); // Generate unique ID
  const expiration = new Date();
  expiration.setDate(expiration.getDate() + 7);

  const { data: shareLink, error: shareLinkError } = await supabase
    .from('sharelinks')
    .insert([
      {
        deal_id: dealId,
        user_id: userId,
        unique_url: uniqueUrl,
        expires_at: expiration.toISOString(),
      },
    ])
    .select()
    .single();

  if (shareLinkError) throw shareLinkError;

  return `https://and.deals/share/${uniqueUrl}`;
};
