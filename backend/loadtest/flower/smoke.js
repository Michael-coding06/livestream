import http from 'k6/http';
import { check } from 'k6';

export const options = {
    vus: 1, // 1 virtual user
    duration: '10s',
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