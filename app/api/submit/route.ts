import { NextResponse } from 'next/server';
import connectToDatabase from '../../../lib/mongodb';
import User from '../../../models/User';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function POST(request: Request) {
  try {
    await connectToDatabase();

    const formData = await request.formData();
    const name = formData.get('name') as string;
    const age = parseInt(formData.get('age') as string);
    const email = formData.get('email') as string;
    const date = new Date(formData.get('date') as string);
    const pic = formData.get('pic') as File | null;

    let picturePath = null;
    if (pic) {
      if (!pic.type.startsWith('image/')) {
        return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
      }
      if (pic.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: 'File size exceeds 5MB' }, { status: 400 });
      }

      const uploadDir = path.join(__dirname, '../../../../public/uploads');
      await fs.mkdir(uploadDir, { recursive: true });
      const fileExtension = path.extname(pic.name);
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}${fileExtension}`;
      const filePath = path.join(uploadDir, fileName);
      const arrayBuffer = await pic.arrayBuffer();
      await fs.writeFile(filePath, Buffer.from(arrayBuffer));
      picturePath = `/uploads/${fileName}`;
    } else {
      return NextResponse.json({ error: 'Picture is required' }, { status: 400 });
    }

    const user = new User({
      name,
      age,
      email,
      date,
      picture: picturePath,
    });

    await user.save();

    return NextResponse.json({ message: 'Form data saved successfully' }, { status: 201 });
  } catch (error: any) {
    console.error('Error saving form data:', error);
    if (error.name === 'MongoServerError' && error.code === 11000) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }
    return NextResponse.json(
      { error: error.message || 'Error saving form data' },
      { status: 500 }
    );
  }
}