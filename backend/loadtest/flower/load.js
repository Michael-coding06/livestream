import http from 'k6/http';
import { check } from 'k6';

export const options = {
    scenarios: {
        flower_load: {
            executor: 'constant-arrival-rate',

            // 100 requests mỗi giây
            rate: 100,

            // Đơn vị của rate
            timeUnit: '1s',

            // Chạy trong 30 giây
            duration: '30s',

            // Số VU khởi tạo trước
            preAllocatedVUs: 20,

            // Cho phép k6 tạo thêm VU nếu cần
            maxVUs: 100,
        },
    },

    thresholds: {
        // 95% request phải < 500ms
        http_req_duration: ['p(95)<500'],

        // Error rate phải < 1%
        http_req_failed: ['rate<0.01'],
    },
};

export default function () {
    const response = http.post(
        'http://localhost:8087/flower/send',
        JSON.stringify({
            roomID: 1,
            user_name: "galery",
            count: 1,
            quantity: 15,
        }),
        {
            headers: {
                'Content-Type': 'application/json',
            },
        }
    );

    check(response, {
        'status is 202': (r) => r.status === 202,
    });
}