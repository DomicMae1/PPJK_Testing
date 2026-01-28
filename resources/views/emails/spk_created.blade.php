<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New SPK Created</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
            line-height: 1.6;
            color: #333;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background: #ffffff;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background-color: #2c3e50;
            color: #ffffff;
            padding: 20px;
            text-align: center;
        }
        .header h2 {
            margin: 0;
            font-size: 24px;
        }
        .content {
            padding: 30px 20px;
        }
        .info-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 25px;
        }
        .info-table td {
            padding: 10px;
            border-bottom: 1px solid #eeeeee;
        }
        .info-table td:first-child {
            font-weight: bold;
            color: #555;
            width: 140px;
        }
        .btn-container {
            text-align: center;
            margin-top: 30px;
            margin-bottom: 20px;
        }
        .btn {
            display: inline-block;
            background-color: #3498db;
            color: #ffffff !important;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 4px;
            font-weight: bold;
            font-size: 16px;
            transition: background-color 0.3s;
        }
        .btn:hover {
            background-color: #2980b9;
        }
        .footer {
            background-color: #f8f9fa;
            padding: 15px;
            text-align: center;
            font-size: 12px;
            color: #888;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>New SPK Notification</h2>
        </div>
        <div class="content">
            <p>Hello Team,</p>
            <p>A new SPK has been created and requires your attention.</p>
            
            <table class="info-table">
                <tr>
                    <td>SPK Code</td>
                    <td>{{ $spk->spk_code }}</td>
                </tr>
                <tr>
                    <td>Customer</td>
                    <td>{{ $spk->customer->nama_perusahaan ?? 'N/A' }}</td>
                </tr>
                <tr>
                    <td>Created By</td>
                    <td>{{ $creator->name }} <br><small>({{ $creator->email }})</small></td>
                </tr>
                <tr>
                    <td>Shipment Type</td>
                    <td>{{ $spk->shipment_type }}</td>
                </tr>
                <tr>
                    <td>Date</td>
                    <td>{{ $spk->created_at->format('d M Y H:i') }}</td>
                </tr>
            </table>

            <div class="btn-container">
                <!-- Button Style Fixed -->
                <a href="{{ route('shipping.show', $spk->id) }}" class="btn">
                    View SPK Details
                </a>
            </div>
            
            <p style="text-align: center; color: #666;">
                Please review and validate this SPK to proceed with the workflow.
            </p>
        </div>
        <div class="footer">
            &copy; {{ date('Y') }} PPJK System. All rights reserved.
        </div>
    </div>
</body>
</html>
