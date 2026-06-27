import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  Module, Injectable, BadRequestException, NotFoundException, ConflictException, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, MinLength, MaxLength } from 'class-validator';
import { UserRole } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, CurrentUser, JwtPayload } from '../auth/decorators/roles.decorator';
import { AuditService } from '../audit/audit.module';

// ─── DTOs ──────────────────────────────────────────────────────────

export class CreateCategoryDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(80) name!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(120) slug?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() parentId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() sortOrder?: number;
}

export class UpdateCategoryDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(80) name?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(120) slug?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() parentId?: string | null;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() sortOrder?: number;
}

// ─── Service ───────────────────────────────────────────────────────

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Return categories with their children. Two output modes via `?flat=1`. */
  async list(opts: { flat?: boolean }) {
    const all = await this.prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { datasets: true, children: true } } },
    });

    if (opts.flat) {
      // Return a flat list, but include a computed `path` (e.g. "Retail > Clothing")
      const byId = new Map(all.map((c) => [c.id, c]));
      const pathOf = (c: any): string => {
        const segs: string[] = [c.name];
        let cur = c;
        while (cur.parentId && byId.has(cur.parentId)) {
          cur = byId.get(cur.parentId)!;
          segs.unshift(cur.name);
        }
        return segs.join(' › ');
      };
      return all.map((c) => ({ ...c, path: pathOf(c) }));
    }

    // Build a tree
    const byId = new Map<string, any>();
    all.forEach((c) => byId.set(c.id, { ...c, children: [] }));
    const roots: any[] = [];
    for (const c of all) {
      const node = byId.get(c.id);
      if (c.parentId && byId.has(c.parentId)) {
        byId.get(c.parentId).children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  }

  async create(dto: CreateCategoryDto, actorId: string) {
    const slug = (dto.slug ?? slugify(dto.name)).toLowerCase();
    if (!slug) throw new BadRequestException('Slug required');

    const existing = await this.prisma.category.findUnique({ where: { slug } });
    if (existing) throw new ConflictException('A category with this slug already exists');

    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({ where: { id: dto.parentId } });
      if (!parent) throw new NotFoundException('Parent category not found');
    }

    const created = await this.prisma.category.create({
      data: {
        name: dto.name.trim(),
        slug,
        parentId: dto.parentId ?? null,
        sortOrder: dto.sortOrder ?? 0,
      },
    });

    await this.audit.log({
      action: 'CATEGORY_CREATED' as any,
      actorId,
      targetType: 'Category',
      targetId: created.id,
      metadata: { name: created.name, slug: created.slug },
    });

    return created;
  }

  async update(id: string, dto: UpdateCategoryDto, actorId: string) {
    const cat = await this.prisma.category.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Category not found');

    // Prevent setting parentId to self or to a descendant (would create a cycle)
    if (dto.parentId !== undefined && dto.parentId !== null) {
      if (dto.parentId === id) throw new BadRequestException('Cannot be its own parent');
      const isDescendant = await this.isDescendant(dto.parentId, id);
      if (isDescendant) throw new BadRequestException('Cannot move a category under one of its descendants');
    }

    let newSlug = dto.slug;
    if (newSlug) {
      newSlug = newSlug.toLowerCase();
      if (newSlug !== cat.slug) {
        const taken = await this.prisma.category.findUnique({ where: { slug: newSlug } });
        if (taken) throw new ConflictException('Slug already in use');
      }
    }

    const updated = await this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(newSlug ? { slug: newSlug } : {}),
        ...(dto.parentId !== undefined ? { parentId: dto.parentId } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });

    await this.audit.log({
      action: 'CATEGORY_UPDATED' as any,
      actorId,
      targetType: 'Category',
      targetId: id,
      metadata: { name: updated.name },
    });

    return updated;
  }

  async delete(id: string, actorId: string) {
    const cat = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { datasets: true, children: true } } },
    });
    if (!cat) throw new NotFoundException();

    if (cat._count.datasets > 0) {
      throw new BadRequestException(
        `Cannot delete — ${cat._count.datasets} dataset(s) still use this category. Reassign them first.`,
      );
    }
    if (cat._count.children > 0) {
      throw new BadRequestException(
        `Cannot delete — ${cat._count.children} subcategory/subcategories exist. Delete or move them first.`,
      );
    }

    await this.prisma.category.delete({ where: { id } });

    await this.audit.log({
      action: 'CATEGORY_DELETED' as any,
      actorId,
      targetType: 'Category',
      targetId: id,
      metadata: { name: cat.name },
    });
  }

  /** Returns true if `descendantId` is the same as or descended from `ancestorId`. */
  private async isDescendant(ancestorId: string, candidateId: string): Promise<boolean> {
    if (ancestorId === candidateId) return true;
    let cursor = await this.prisma.category.findUnique({
      where: { id: ancestorId },
      select: { parentId: true },
    });
    let depth = 0;
    while (cursor?.parentId && depth < 50) {
      if (cursor.parentId === candidateId) return true;
      cursor = await this.prisma.category.findUnique({
        where: { id: cursor.parentId },
        select: { parentId: true },
      });
      depth++;
    }
    return false;
  }
}

// ─── Controller ────────────────────────────────────────────────────

@ApiTags('categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly svc: CategoriesService) {}

  @Get()
  list(@Query('flat') flat?: string) {
    return this.svc.list({ flat: flat === '1' || flat === 'true' });
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateCategoryDto, @CurrentUser() user: JwtPayload) {
    return this.svc.create(dto, user.sub);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto, @CurrentUser() user: JwtPayload) {
    return this.svc.update(id, dto, user.sub);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  delete(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.svc.delete(id, user.sub);
  }
}

// ─── Module ────────────────────────────────────────────────────────

@Module({
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}

// ─── Helpers ───────────────────────────────────────────────────────

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
