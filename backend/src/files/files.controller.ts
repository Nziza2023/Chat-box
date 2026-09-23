import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuid } from 'uuid';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// Which file types we accept, and which "message type" bucket they map to.
// This keeps the frontend from ever having to send a raw mime-type guess.
const ALLOWED_TYPES: Record<string, 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE'> = {
  'image/png': 'IMAGE',
  'image/jpeg': 'IMAGE',
  'image/webp': 'IMAGE',
  'image/gif': 'IMAGE',
  'video/mp4': 'VIDEO',
  'video/webm': 'VIDEO',
  'audio/webm': 'AUDIO',
  'audio/mpeg': 'AUDIO',
  'audio/mp3': 'AUDIO',
  'audio/ogg': 'AUDIO',
  'application/pdf': 'FILE',
  'application/msword': 'FILE',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'FILE',
  'text/plain': 'FILE',
};

const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25MB — matches MAX_FILE_SIZE_MB in .env

@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        // Never trust the original filename — rename to a random uuid so
        // two users uploading "photo.jpg" at the same time can't collide,
        // and so a malicious filename can't do anything odd on our server.
        filename: (_req, file, cb) => {
          const unique = uuid();
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: MAX_SIZE_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_TYPES[file.mimetype]) {
          cb(new BadRequestException(`File type ${file.mimetype} is not allowed`), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file was uploaded');
    }

    return {
      url: `/uploads/${file.filename}`,
      fileName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      suggestedMessageType: ALLOWED_TYPES[file.mimetype],
    };
  }
}
