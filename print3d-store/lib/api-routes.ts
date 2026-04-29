// ─────────────────────────────────────────────
// lib/auth.ts — NextAuth configuration
// ─────────────────────────────────────────────
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "E-posta", type: "email" },
        password: { label: "Şifre", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.adminUser.findUnique({
          where: { email: credentials.email },
        });

        if (!user) return null;

        const isValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isValid) return null;

        // Update lastLoginAt
        await prisma.adminUser.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: string }).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string; role?: string }).id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
};

// ─────────────────────────────────────────────
// app/api/auth/[...nextauth]/route.ts
// ─────────────────────────────────────────────
// import NextAuth from "next-auth";
// import { authOptions } from "@/lib/auth";
// const handler = NextAuth(authOptions);
// export { handler as GET, handler as POST };


// ─────────────────────────────────────────────
// app/api/admin/products/route.ts
// ─────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import slugify from "slugify";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const search = req.nextUrl.searchParams.get("search") ?? "";
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ],
    },
    include: {
      category: { select: { name: true, slug: true } },
      images: { select: { url: true, isPrimary: true }, orderBy: { sortOrder: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { images, ...productData } = body;

  // Generate unique slug
  let slug = slugify(productData.name, { lower: true, strict: true });
  const existing = await prisma.product.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now()}`;

  const product = await prisma.product.create({
    data: {
      ...productData,
      slug,
      price: parseFloat(productData.price),
      images: {
        create: images?.map((img: { url: string; publicId?: string; isPrimary: boolean }, i: number) => ({
          url: img.url,
          publicId: img.publicId,
          isPrimary: img.isPrimary,
          sortOrder: i,
        })) ?? [],
      },
    },
    include: { images: true, category: true },
  });

  return NextResponse.json({ product }, { status: 201 });
}


// ─────────────────────────────────────────────
// app/api/admin/products/[id]/route.ts
// ─────────────────────────────────────────────
export async function GET_SINGLE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: { images: true, category: true },
  });

  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ product });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { images, ...productData } = body;

  const product = await prisma.product.update({
    where: { id: params.id },
    data: {
      ...productData,
      price: parseFloat(productData.price),
      images: {
        deleteMany: {},
        create: images?.map((img: { url: string; publicId?: string; isPrimary: boolean }, i: number) => ({
          url: img.url,
          publicId: img.publicId,
          isPrimary: img.isPrimary,
          sortOrder: i,
        })) ?? [],
      },
    },
    include: { images: true, category: true },
  });

  return NextResponse.json({ product });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const product = await prisma.product.update({
    where: { id: params.id },
    data: body,
  });

  return NextResponse.json({ product });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get Cloudinary public IDs to delete
  const images = await prisma.productImage.findMany({
    where: { productId: params.id },
    select: { publicId: true },
  });

  // Delete from Cloudinary
  for (const img of images) {
    if (img.publicId) {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/upload/${img.publicId}`, {
        method: "DELETE",
      });
    }
  }

  await prisma.product.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}


// ─────────────────────────────────────────────
// app/api/admin/upload/route.ts — Cloudinary upload
// ─────────────────────────────────────────────
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function UPLOAD_POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const result = await new Promise<{ secure_url: string; public_id: string }>(
    (resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: "print3d-store/products",
          resource_type: "image",
          transformation: [
            { width: 1200, height: 1200, crop: "limit", quality: "auto:best" },
          ],
        },
        (err, result) => {
          if (err || !result) reject(err);
          else resolve(result as { secure_url: string; public_id: string });
        }
      ).end(buffer);
    }
  );

  return NextResponse.json({
    url: result.secure_url,
    publicId: result.public_id,
  });
}


// ─────────────────────────────────────────────
// app/api/admin/orders/[id]/route.ts
// ─────────────────────────────────────────────
export async function PATCH_ORDER(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { status } = await req.json();

  const order = await prisma.order.update({
    where: { id: params.id },
    data: { status },
  });

  return NextResponse.json({ order });
}
