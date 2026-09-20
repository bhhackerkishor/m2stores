"use client";

import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, Navigation } from "swiper/modules";
import { ChevronLeft, ChevronRight } from "lucide-react";

import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";

export interface Banner {
  _id: string;
  image: string;
  title: string;
  link?: string;
}

interface BannerCarouselProps {
  banners: Banner[];
}
export default function BannerCarousel({ banners }: BannerCarouselProps) {
  if (!banners || banners.length === 0) {
    return null;
  }

  return (
    <div className="relative w-full max-w-[1400px] mx-auto group my-3 px-2 sm:px-4">
      <Swiper
        spaceBetween={0}
        centeredSlides={true}
        loop={banners.length > 1}
        autoplay={{
          delay: 3500,
          disableOnInteraction: false,
          pauseOnMouseEnter: true,
        }}
        pagination={{
          clickable: true,
          el: ".custom-swiper-pagination",
        }}
        navigation={{
          nextEl: ".button-next",
          prevEl: ".button-prev",
        }}
        modules={[Autoplay, Pagination, Navigation]}
        className="w-full rounded-lg overflow-hidden shadow-sm"
      >
        {banners.map((banner) => (
          <SwiperSlide key={banner._id}>
            <a
              href={banner.link || "#"}
              className="block w-full h-[180px] sm:h-[280px] md:h-[350px] lg:h-[400px]"
            >
              <img
                src={banner.image}
                alt={banner.title}
                className="w-full h-full object-cover"
              />
            </a>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Navigation Controls */}
      <button className="button-prev absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white text-gray-800 p-2 sm:p-3 rounded-r-md shadow-md transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center">
        <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      <button className="button-next absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white text-gray-800 p-2 sm:p-3 rounded-l-md shadow-md transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center">
        <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      {/* Pagination Container */}
      <div className="custom-swiper-pagination flex justify-center gap-1.5 mt-2" />
    </div>
  );
}