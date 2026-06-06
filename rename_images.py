import os
from pathlib import Path

def rename_images(base_dir):
    # 遍历所有产品目录
    for product_dir in os.listdir(base_dir):
        product_path = os.path.join(base_dir, product_dir)
        
        # 确保是目录
        if not os.path.isdir(product_path):
            continue
            
        # 获取所有图片文件
        image_files = [f for f in os.listdir(product_path) 
                      if f.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp'))]
        
        # 按文件名排序
        image_files.sort()
        
        # 重命名文件
        for index, old_name in enumerate(image_files, 1):
            # 获取文件扩展名
            _, ext = os.path.splitext(old_name)
            # 新文件名格式：产品类别-序号.扩展名
            new_name = f"{product_dir}-{index:03d}{ext}"
            
            old_path = os.path.join(product_path, old_name)
            new_path = os.path.join(product_path, new_name)
            
            try:
                os.rename(old_path, new_path)
                print(f"已重命名: {old_name} -> {new_name}")
            except Exception as e:
                print(f"重命名 {old_name} 时出错: {str(e)}")

if __name__ == "__main__":
    # 设置基础目录路径
    base_dir = "images/products"
    
    # 确保目录存在
    if not os.path.exists(base_dir):
        print(f"错误：目录 {base_dir} 不存在")
        exit(1)
        
    print("开始重命名图片文件...")
    rename_images(base_dir)
    print("重命名完成！") 