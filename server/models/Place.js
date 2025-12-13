import mongoose from "mongoose";

const placeSchema = new mongoose.Schema(
  {
    // ===== 고유 식별자 =====
    contentId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },

    // ===== 기본 정보 =====
    title: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    category: {
      type: String,
      enum: ["카페", "맛집", "역사/문화", "자연", "쇼핑", "캠핑", "숙소"],
      required: true,
      index: true,
    },

    // ===== 주소 정보 =====
    address: {
      full: {
        type: String,
        required: true,
      },
      city: {
        // 시/도
        type: String,
        required: true,
        index: true,
      },
      district: {
        // 시군구
        type: String,
        required: true,
        index: true,
      },
    },

    // ===== 좌표 (GeoJSON 형식) =====
    coordinates: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true,
        validate: {
          validator: function (v) {
            return (
              v.length === 2 &&
              v[0] >= 124 &&
              v[0] <= 132 && // 경도 범위 (한국)
              v[1] >= 33 &&
              v[1] <= 43
            ); // 위도 범위 (한국)
          },
          message: "올바른 한국 좌표 범위가 아닙니다.",
        },
      },
    },

    // ===== 추가 정보 (선택사항) =====
    description: String,
    tel: String,
    homepage: String,
    images: [String],

    // ===== 운영 정보 =====
    operationInfo: {
      openingHours: String,
      closedDays: [String],
    },

    // ===== 비용 정보 =====
    averageCost: {
      type: Number,
      default: 0,
    },
    estimatedTime: {
      // 예상 소요 시간 (분)
      type: Number,
      default: 60,
    },

    // ===== 통계 (자체 집계) =====
    stats: {
      viewCount: { type: Number, default: 0 },
      bookmarkCount: { type: Number, default: 0 },
      visitCount: { type: Number, default: 0 },
      rating: { type: Number, default: 0, min: 0, max: 5 },
    },

    // ===== 태그 =====
    tags: [String],

    // ===== 데이터 관리 =====
    isActive: {
      type: Boolean,
      default: true,
    },
    dataSource: {
      type: String,
      enum: ["KTO", "SBIZ", "MANUAL"],
      default: "KTO",
    },
    lastSyncedAt: Date,
  },
  {
    timestamps: true,
  }
);

// ===== 복합 인덱스 =====
// 지역 + 카테고리 검색 최적화
placeSchema.index({
  "address.city": 1,
  "address.district": 1,
  category: 1,
});

// 지도 반경 검색 최적화
placeSchema.index({ coordinates: "2dsphere" });

// 인기도 정렬
placeSchema.index({
  "stats.bookmarkCount": -1,
  "stats.rating": -1,
});

// 텍스트 검색
placeSchema.index({
  title: "text",
  "address.full": "text",
  tags: "text",
});

// ===== Virtual: 좌표를 {lat, lng} 형식으로 반환 =====
placeSchema.virtual("latLng").get(function () {
  return {
    lat: this.coordinates.coordinates[1],
    lng: this.coordinates.coordinates[0],
  };
});

// ===== 메소드: 데이터 소스 자동 감지 =====
placeSchema.pre("save", function (next) {
  if (!this.dataSource) {
    // contentId 접두사로 데이터 소스 추론
    if (this.contentId.startsWith("CAFE_")) {
      this.dataSource = "SBIZ";
    } else {
      this.dataSource = "KTO";
    }
  }
  next();
});

export default mongoose.model("Place", placeSchema, "place");
