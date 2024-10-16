

document.getElementById('payment-form')
    .addEventListener('submit', async function (event) {
        event.preventDefault();  // 기본 제출 이벤트 막기

        const orderId = document.getElementById('orderId').value;
        const payMethod = document.getElementById('payMethod').value;
        const totalAmount = document.getElementById('paymentAmount').value;
        const deliveryId = document.getElementById('deliveryId').value;
        const deliveryMemoId = document.getElementById('deliveryMemoId').value;
        const pointAmount = document.getElementById('pointAmount').value;
        const couponAmount = document.getElementById('couponAmount').value;
        
        const environment
            = await fetch('http://localhost:3000/apis/orders/payments/env?email=test@email.com');
        
        const env = await environment.json();

        const paymentRequest = {
            storeId: env.storeId,
            channelKey: env.channelKey,
            paymentId: `payment-${uuid.v4()}`,
            orderName: orderId,
            totalAmount: totalAmount,
            currency: "CURRENCY_KRW",
            payMethod: payMethod
        };

        const response = await PortOne.requestPayment(paymentRequest);

        if (response.code != null) {
            // 오류 발생
            return alert(response.message);
        }

        const paymentInput = {
            paymentId: paymentRequest.paymentId,
            orderId: parseInt(orderId),
            payMethod: payMethod,
            deliveryId: parseInt(deliveryId),
            deliveryMemoId: parseInt(deliveryMemoId),
            pointAmount: parseInt(pointAmount) || 0,
            couponAmount: parseInt(couponAmount) || 0
        };

        try {
            const notified = await fetch(`http://localhost:3000/apis/orders/payments?email=test@email.com`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(paymentInput)
            });

            if (notified.ok) {
                const result = await notified.json();
                alert('결제 성공: ' + JSON.stringify(result));
            } else {
                const errorResult = await notified.json();
                alert('결제 실패: ' + JSON.stringify(errorResult));
            }
        } catch (error) {
            alert('결제 중 오류 발생: ' + error.message);
        }
    });    
