import { supabase } from "@/lib/supabase";

export type MerchandiseItem = {
  id: number;
  productName: string;
  productDescription: string;
};

export type MerchandiseVariant = {
  id: number;
  productId: number;
  productSize: string;
  productColor: string;
  productPrice: string;
  productQuantity: number;
};

export type MerchandiseImage = {
  id: number;
  productId: number;
  imageUrl: string;
};

export type MerchandiseItemWithVariants = MerchandiseItem & {
  variants: MerchandiseVariant[];
  images: MerchandiseImage[];
};

export async function fetchMerchandise(): Promise<MerchandiseItemWithVariants[]> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return [];

  const { data: itemData, error: itemError } = await supabase
    .from("tradesperson_SellersSpecialty")
    .select("*")
    .eq("tradesperson_id", authData.user.id);

  if (itemError) throw new Error(itemError.message);

  const items = (itemData ?? []) as Record<string, unknown>[];
  if (items.length === 0) return [];

  const itemIds = items.map((r) => r.id as number);

  const [variantRes, imageRes] = await Promise.all([
    supabase.from("tradesperson_Sell.Spe.variant").select("*").in("product_id", itemIds),
    supabase.from("tradesperson_Sell.Spe.images").select("*").in("product_id", itemIds),
  ]);

  if (variantRes.error) throw new Error(variantRes.error.message);
  if (imageRes.error) throw new Error(imageRes.error.message);

  const variants = ((variantRes.data ?? []) as Record<string, unknown>[]).map((r) => ({
    id:              r.id               as number,
    productId:       r.product_id       as number,
    productSize:     (r.product_size    as string) ?? "",
    productColor:    (r.product_color   as string) ?? "",
    productPrice:    String(r.product_price ?? ""),
    productQuantity: (r.product_quantity as number) ?? 0,
  }));

  const images = ((imageRes.data ?? []) as Record<string, unknown>[]).map((r) => ({
    id:        r.id            as number,
    productId: r.product_id   as number,
    imageUrl:  r.product_imgURL as string,
  }));

  return items.map((r) => ({
    id:                 r.id                  as number,
    productName:        r.product_name         as string,
    productDescription: r.product_description  as string,
    variants:           variants.filter((v) => v.productId === (r.id as number)),
    images:             images.filter((img) => img.productId === (r.id as number)),
  }));
}

export async function addMerchandiseItem(
  item: Omit<MerchandiseItem, "id">
): Promise<MerchandiseItem> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("tradesperson_SellersSpecialty")
    .insert({
      tradesperson_id:     authData.user.id,
      product_name:        item.productName,
      product_description: item.productDescription,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  const r = data as Record<string, unknown>;
  return {
    id:                 r.id                  as number,
    productName:        r.product_name         as string,
    productDescription: r.product_description  as string,
  };
}

export async function updateMerchandiseItem(item: MerchandiseItem): Promise<void> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("tradesperson_SellersSpecialty")
    .update({
      product_name:        item.productName,
      product_description: item.productDescription,
    })
    .eq("id", item.id)
    .eq("tradesperson_id", authData.user.id);

  if (error) throw new Error(error.message);
}

export async function deleteMerchandiseItem(id: number): Promise<void> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error("Not authenticated");

  // Fetch image records before deleting them so we can remove the storage files
  const { data: imageRows } = await supabase
    .from("tradesperson_Sell.Spe.images")
    .select("product_imgURL")
    .eq("product_id", id);

  // Delete child rows first and verify before touching the parent (FK constraint)
  const { error: variantDeleteError } = await supabase
    .from("tradesperson_Sell.Spe.variant")
    .delete()
    .eq("product_id", id);
  if (variantDeleteError) throw new Error(variantDeleteError.message);

  const { error: imageDeleteError } = await supabase
    .from("tradesperson_Sell.Spe.images")
    .delete()
    .eq("product_id", id);
  if (imageDeleteError) throw new Error(imageDeleteError.message);

  // Delete files from storage
  const storagePaths = ((imageRows ?? []) as Record<string, unknown>[])
    .map((r) => extractStoragePath(r.product_imgURL as string))
    .filter(Boolean) as string[];
  if (storagePaths.length > 0) {
    await supabase.storage.from("pro_merchandise").remove(storagePaths);
  }

  const { error } = await supabase
    .from("tradesperson_SellersSpecialty")
    .delete()
    .eq("id", id)
    .eq("tradesperson_id", authData.user.id);

  if (error) throw new Error(error.message);
}

export async function addVariant(
  variant: Omit<MerchandiseVariant, "id">
): Promise<MerchandiseVariant> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error("Not authenticated");

  const { data: product } = await supabase
    .from("tradesperson_SellersSpecialty")
    .select("id")
    .eq("id", variant.productId)
    .eq("tradesperson_id", authData.user.id)
    .maybeSingle();
  if (!product) throw new Error("Product not found or access denied");

  const { data, error } = await supabase
    .from("tradesperson_Sell.Spe.variant")
    .insert({
      product_id:       variant.productId,
      product_size:     variant.productSize || null,
      product_color:    variant.productColor || null,
      product_price:    variant.productPrice,
      product_quantity: variant.productQuantity,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  const r = data as Record<string, unknown>;
  return {
    id:              r.id               as number,
    productId:       r.product_id       as number,
    productSize:     (r.product_size    as string) ?? "",
    productColor:    (r.product_color   as string) ?? "",
    productPrice:    String(r.product_price ?? ""),
    productQuantity: (r.product_quantity as number) ?? 0,
  };
}

export async function updateVariant(variant: MerchandiseVariant): Promise<void> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error("Not authenticated");

  const { data: product } = await supabase
    .from("tradesperson_SellersSpecialty")
    .select("id")
    .eq("id", variant.productId)
    .eq("tradesperson_id", authData.user.id)
    .maybeSingle();
  if (!product) throw new Error("Product not found or access denied");

  const { error } = await supabase
    .from("tradesperson_Sell.Spe.variant")
    .update({
      product_size:     variant.productSize || null,
      product_color:    variant.productColor || null,
      product_price:    variant.productPrice,
      product_quantity: variant.productQuantity,
    })
    .eq("id", variant.id)
    .eq("product_id", variant.productId);

  if (error) throw new Error(error.message);
}

export async function deleteVariant(id: number): Promise<void> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error("Not authenticated");

  const { data: variant } = await supabase
    .from("tradesperson_Sell.Spe.variant")
    .select("product_id")
    .eq("id", id)
    .maybeSingle();
  if (!variant) throw new Error("Variant not found");

  const { data: product } = await supabase
    .from("tradesperson_SellersSpecialty")
    .select("id")
    .eq("id", variant.product_id)
    .eq("tradesperson_id", authData.user.id)
    .maybeSingle();
  if (!product) throw new Error("Access denied");

  const { error } = await supabase
    .from("tradesperson_Sell.Spe.variant")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}

function extractStoragePath(publicUrl: string): string | null {
  const marker = "/pro_merchandise/";
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.slice(idx + marker.length);
}

export async function uploadMerchandiseImage(file: File, productId: number): Promise<string> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error("Not authenticated");

  const ALLOWED_IMAGE_TYPES: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  const ext = ALLOWED_IMAGE_TYPES[file.type];
  if (!ext) throw new Error("Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.");

  const path = `${authData.user.id}/${productId}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("pro_merchandise")
    .upload(path, file, { upsert: true });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage
    .from("pro_merchandise")
    .getPublicUrl(path);

  return data.publicUrl;
}

export async function saveMerchandiseImageUrl(
  productId: number,
  imageUrl: string
): Promise<MerchandiseImage> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error("Not authenticated");

  const { data: product } = await supabase
    .from("tradesperson_SellersSpecialty")
    .select("id")
    .eq("id", productId)
    .eq("tradesperson_id", authData.user.id)
    .maybeSingle();
  if (!product) throw new Error("Product not found or access denied");

  const { data, error } = await supabase
    .from("tradesperson_Sell.Spe.images")
    .insert({
      product_id:     productId,
      product_imgURL: imageUrl,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  const r = data as Record<string, unknown>;
  return {
    id:        r.id            as number,
    productId: r.product_id   as number,
    imageUrl:  r.product_imgURL as string,
  };
}

export async function deleteMerchandiseImageUrl(imageId: number, imageUrl: string): Promise<void> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error("Not authenticated");

  const { data: image } = await supabase
    .from("tradesperson_Sell.Spe.images")
    .select("product_id")
    .eq("id", imageId)
    .maybeSingle();
  if (!image) throw new Error("Image not found");

  const { data: product } = await supabase
    .from("tradesperson_SellersSpecialty")
    .select("id")
    .eq("id", image.product_id)
    .eq("tradesperson_id", authData.user.id)
    .maybeSingle();
  if (!product) throw new Error("Access denied");

  const storagePath = extractStoragePath(imageUrl);
  if (storagePath) {
    await supabase.storage.from("pro_merchandise").remove([storagePath]);
  }

  const { error } = await supabase
    .from("tradesperson_Sell.Spe.images")
    .delete()
    .eq("id", imageId);

  if (error) throw new Error(error.message);
}
