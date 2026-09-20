"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

interface MegaMenuProps {
  categories: Array<{
    _id: string;
    name: string;
    slug: string;
    level: number;
    image?: string;
    parentCategoryId?: string | { _id: string } | null;
    subcategories?: Array<{
      name: string;
      slug: string;
    }>;
  }>;
}

export function CategoryMegaMenu({ categories }: MegaMenuProps) {
  const pathname = usePathname();
  const topLevel = categories.filter((c) => c.level === 0);

  const getParentId = (c: {
    parentCategoryId?: string | { _id: string } | null;
  }) => {
    if (!c.parentCategoryId) return null;
    return typeof c.parentCategoryId === "string"
      ? c.parentCategoryId
      : c.parentCategoryId._id;
  };

  return (
    <nav className="bg-surface-900 text-white py-5 border-b border-surface-800">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {topLevel.map((category) => {
            const isActive =
              pathname === `/category/${category.slug}` ||
              pathname.startsWith(`/category/${category.slug}/`);
            const subcats = categories.filter(
              (c) => getParentId(c) === category._id
            );

            return (
              <div key={category._id} className="relative group flex-shrink-0">
                <Link
                  href={`/category/${category.slug}`}
                  className={`
                    flex flex-col items-center gap-2.5 px-3 py-2.5 rounded-2xl
                    transition-all duration-200 ease-out
                    ${
                      isActive
                        ? "bg-blue-600/20 ring-1 ring-blue-500/50"
                        : "hover:bg-surface-800/80"
                    }
                  `}
                >
                  {/* Circular image container */}
                  <div
                    className={`
                      relative w-14 h-14 rounded-full overflow-hidden
                      bg-surface-800 ring-2 transition-all duration-200
                      ${
                        isActive
                          ? "ring-blue-400 scale-105"
                          : "ring-surface-700 group-hover:ring-surface-500 group-hover:scale-105"
                      }
                    `}
                  >
                    {category.image ? (
                      <Image
                        src={category.image}
                        alt={category.name}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-surface-700 to-surface-800">
                        <span className="text-lg font-semibold text-surface-300">
                          {category.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Typography */}
                  <span
                    className={`
                      text-[13px] font-medium tracking-tight leading-none
                      whitespace-nowrap transition-colors duration-200
                      ${
                        isActive
                          ? "text-blue-300"
                          : "text-surface-300 group-hover:text-white"
                      }
                    `}
                  >
                    {category.name}
                  </span>
                </Link>

                {/* Submenu */}
                {subcats.length > 0 && (
                  <div
                    className="
                      absolute left-1/2 -translate-x-1/2 top-full mt-3
                      w-56 bg-white rounded-2xl shadow-xl border border-surface-100
                      opacity-0 invisible translate-y-1
                      group-hover:opacity-100 group-hover:visible group-hover:translate-y-0
                      transition-all duration-200 ease-out z-50
                      before:content-[''] before:absolute before:-top-1.5 before:left-1/2 before:-translate-x-1/2
                      before:w-3 before:h-3 before:bg-white before:rotate-45 before:border-l before:border-t before:border-surface-100
                    "
                  >
                    <div className="p-2">
                      {subcats.map((sub) => (
                        <Link
                          key={sub.slug}
                          href={`/category/${sub.slug}`}
                          className="
                            block px-3.5 py-2.5 text-sm font-medium text-surface-700
                            rounded-xl hover:bg-surface-50 hover:text-surface-900
                            transition-colors duration-150
                          "
                        >
                          {sub.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </nav>
  );
}