import mongoose from "mongoose";

const tripSchema = new mongoose.Schema(
  {
    // 기본 정보
    title: {
      type: String,
      required: [true, "여행 제목을 입력해주세요."],
      trim: true,
      maxlength: [100, "여행 제목은 100자 이하여야 합니다."],
    },
    description: {
      type: String,
      maxlength: [500, "여행 설명은 500자 이하여야 합니다."],
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // 여행 일정
    startDate: {
      type: Date,
      required: [true, "시작 날짜를 입력해주세요"],
    },
    endDate: {
      type: Date,
      required: [true, "종료 날짜를 입력해주세요"],
      validate: {
        validator: function (value) {
          return value > this.startDate;
        },
        message: "종료 날짜는 시작 날짜 이후여야 합니다.",
      },
    },
    duration: {
      type: Number,
      required: true,
      min: 1,
      max: 365,
    },

    // // 출발지 (자유 입력 - 카카오 맵 API 사용)
    // origin: {
    //   // 입력 타입
    //   type: {
    //     type: String,
    //     enum: ["current-location", "manual-input"],
    //     required: true,
    //   },
    //   // 사용자가 입력한 원본 텍스트 (주소 검색어)
    //   inputText: String,

    //   // 카카오 맵 API로 변환된 정보
    //   name: {
    //     type: String,
    //     required: true, // 예: "서울특별시 강남구 역삼동"
    //   },
    //   address: {
    //     full: String, // 전체 주소
    //     roadAddress: String, // 도로명 주소
    //     jibunAddress: String, // 지번 주소
    //   },
    //   coordinates: {
    //     lat: {
    //       type: Number,
    //       required: true,
    //     },
    //     lng: {
    //       type: Number,
    //       required: true,
    //     },
    //   },
    //   // 카카오 맵 API 응답 원본 (필요시 참조)
    //   kakaoData: {
    //     place_id: String,
    //     category_name: String,
    //     phone: String,
    //   },
    // },

    // 도착지 (선택 기반 - 시/도 → 시군구)
    destination: {
      // 선택된 시/도
      city: {
        type: String,
        required: true,
      },
      // 선택된 시군구
      district: {
        type: String,
        required: true,
      },
      // 표시용 전체 이름
      name: {
        type: String,
        required: true, // 예: "부산광역시 해운대구"
      },
      // 중심 좌표 (지도 초기 뷰포트 설정용)
      centerCoordinates: {
        lat: Number,
        lng: Number,
      },
    },

    // 여행 스타일/테마 (복수 선택 가능)
    categories: [
      {
        type: String,
        enum: ["카페", "맛집", "역사/문화", "자연", "쇼핑", "캠핑"],
      },
    ],

    // 템플릿 사용 여부
    template: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Template",
      default: null,
    },

    peopleCount: {
      type: Number,
      default: 1,
      min: 1,
      max: 20,
    },

    // 제약 조건
    constraints: {
      budget: {
        perPerson: { type: Number, default: 0, min: 0 }, // 개인당 예산
        total: { type: Number, default: 0, min: 0 }, // 총 예산 (자동 계산)
        spent: { type: Number, default: 0, min: 0 },
      },
      // 나중에 추가 가능
      // time: {
      //     dailyLimit: { type: Number, default: 480, min: 0 },  // 하루 활동 시간 제한 (분)
      //     totalLimit: { type: Number, default: 0, min: 0 },    // 전체 활동 시간 제한
      //     spent: { type: Number, default: 0, min: 0 }
      // }
    },

    // 활성 경로
    activeRoute: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Route",
      default: null,
    },

    // 협업자(실시간 공유)
    collaborators: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        role: {
          type: String,
          enum: ["owner", "editor", "viewer"],
          default: "viewer",
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // 버킷리스트 연동
    bucketlists: [
      {
        bucketlistId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Bucketlist",
        },
        progress: {
          type: Number,
          default: 0,
        },
        target: { type: Number, required: true },
        isCompleted: { type: Boolean, default: false },
      },
    ],

    // 여행 상태
    status: {
      type: String,
      enum: ["planning", "active", "completed", "cancelled"],
      default: "planning",
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    stats: {
      views: { type: Number, default: 0 },
      likes: { type: Number, default: 0 }, // 오타 수정: like → likes
      shares: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual 관계 추가
tripSchema.virtual("routes", {
  ref: "Route",
  localField: "_id",
  foreignField: "tripId",
});

tripSchema.virtual("memos", {
  ref: "Memo",
  localField: "_id",
  foreignField: "tripId",
});

tripSchema.virtual("budgets", {
  ref: "Budget",
  localField: "_id",
  foreignField: "tripId",
});

// Pre-save Hook으로 총 예산 자동 계산
tripSchema.pre("save", function (next) {
  if (this.peopleCount && this.constraints.budget.perPerson) {
    this.constraints.budget.total =
      this.peopleCount * this.constraints.budget.perPerson;
  }
  next();
});

export default mongoose.model("Trip", tripSchema);
